import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from '../entities/review.entity.js';
import { ReviewPhoto } from '../entities/review-photo.entity.js';
import { Bar } from '../entities/bar.entity.js';
import { BarReviewStats } from '../entities/bar-review-stats.entity.js';
import { ReviewStatsService } from './review-stats.service.js';
import { runInTransaction } from '../common/utils/transaction.js';
import { BarStatus, ReviewStatus, Role } from '@my-project/shared';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';
import { buildPaginationMeta } from '../common/utils/pagination.js';
import { toReviewItem, toReviewStats } from './review-presenter.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ReviewPhoto)
    private readonly reviewPhotoRepository: Repository<ReviewPhoto>,
    @InjectRepository(Bar)
    private readonly barRepository: Repository<Bar>,
    @InjectRepository(BarReviewStats)
    private readonly barReviewStatsRepository: Repository<BarReviewStats>,
    private readonly reviewStatsService: ReviewStatsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 리뷰를 생성한다.
   */
  async create(dto: CreateReviewDto, user: { id: number }) {
    const bar = await this.barRepository.findOne({ where: { id: dto.barId } });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.status !== BarStatus.APPROVED) {
      throw new NotFoundException('Bar not found.');
    }

    const existing = await this.reviewRepository.findOne({
      where: { userId: user.id, barId: dto.barId },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this bar.');
    }

    try {
      const saved = await runInTransaction(this.dataSource, async (manager) => {
        const review = manager.create(Review, {
          userId: user.id,
          barId: dto.barId,
          rating: dto.rating,
          content: dto.content,
          visitedAt: dto.visitedAt ?? null,
          status: ReviewStatus.PUBLISHED,
        });
        const result = await manager.save(review);

        await this.reviewStatsService.incrementStats(
          dto.barId,
          dto.rating,
          false,
          manager,
        );

        return result;
      });

      const full = await this.reviewRepository.findOne({
        where: { id: saved.id },
        relations: ['user', 'photos'],
      });

      return toReviewItem(full!);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('You have already reviewed this bar.');
      }
      throw error;
    }
  }

  /**
   * 바별 리뷰 목록을 조회한다.
   */
  async findByBarId(
    barId: number,
    query: ListReviewsQueryDto,
    user: { id: number; role: Role },
  ) {
    const bar = await this.barRepository.findOne({ where: { id: barId } });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.status !== BarStatus.APPROVED) {
      const isOwner = bar.ownerId === user.id;
      const isAdmin = user.role === Role.ADMIN;
      if (!isOwner && !isAdmin) {
        throw new NotFoundException('Bar not found.');
      }
    }

    const { page = 1, limit = 20 } = query;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.photos', 'photo', 'photo.deletedAt IS NULL')
      .where('review.barId = :barId', { barId })
      .andWhere('review.deletedAt IS NULL');

    if (user.role !== Role.ADMIN) {
      qb.andWhere('review.status = :status', {
        status: ReviewStatus.PUBLISHED,
      });
    }

    qb.orderBy('review.createdAt', 'DESC');
    qb.addOrderBy('photo.sortOrder', 'ASC');

    qb.skip((page - 1) * limit).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();

    const stats = await this.barReviewStatsRepository.findOne({
      where: { barId },
    });

    return {
      items: items.map(toReviewItem),
      meta: buildPaginationMeta(page, limit, totalItems),
      stats: toReviewStats(stats),
    };
  }

  /**
   * 내 리뷰를 조회한다. 없으면 null 반환.
   */
  async findMyReview(
    barId: number,
    userId: number,
  ) {
    const review = await this.reviewRepository.findOne({
      where: { barId, userId },
      relations: ['user', 'photos'],
    });

    return review ? toReviewItem(review) : null;
  }

  /**
   * 리뷰를 수정한다.
   */
  async update(
    reviewId: number,
    dto: UpdateReviewDto,
    user: { id: number },
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own review.');
    }

    await runInTransaction(this.dataSource, async (manager) => {
      if (
        dto.rating !== undefined &&
        dto.rating !== review.rating &&
        review.status === ReviewStatus.PUBLISHED
      ) {
        await this.reviewStatsService.adjustRating(
          review.barId,
          review.rating,
          dto.rating,
          manager,
        );
      }

      Object.assign(review, dto);
      await manager.save(review);
    });

    const full = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['user', 'photos'],
    });

    return toReviewItem(full!);
  }

  /**
   * 리뷰를 삭제한다 (soft delete).
   */
  async remove(reviewId: number, user: { id: number }): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own review.');
    }

    await runInTransaction(this.dataSource, async (manager) => {
      await manager.update(
        ReviewPhoto,
        { reviewId },
        { deletedAt: new Date() },
      );

      const wasPublished = review.status === ReviewStatus.PUBLISHED;
      await manager.softRemove(review);

      if (wasPublished) {
        await this.reviewStatsService.decrementStats(
          review.barId,
          review.rating,
          review.photoCount > 0,
          manager,
        );
      }
    });
  }
}
