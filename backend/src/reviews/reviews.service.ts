import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from '../entities/review.entity.js';
import { ReviewPhoto } from '../entities/review-photo.entity.js';
import { Bar } from '../entities/bar.entity.js';
import { BarReviewStats } from '../entities/bar-review-stats.entity.js';
import { ReviewStatsService } from './review-stats.service.js';
import { S3Client } from '../external/aws/clients/s3.client.js';
import { runInTransaction } from '../common/utils/transaction.js';
import { BarStatus, ReviewStatus, Role } from '@my-project/shared';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';

/**
 * Review 엔티티를 프론트엔드 ReviewItem 형태로 변환한다.
 */
function toReviewItem(review: Review) {
  return {
    id: review.id,
    rating: review.rating,
    content: review.content,
    visitedAt: review.visitedAt,
    status: review.status,
    author: review.user
      ? {
          id: review.user.id,
          name: review.user.name,
          profileImageUrl: review.user.profileImage,
        }
      : null,
    photos: (review.photos || []).map((photo) => ({
      id: photo.id,
      url: photo.url,
      sortOrder: photo.sortOrder,
    })),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

/**
 * BarReviewStats를 프론트엔드 ReviewStats 형태로 변환한다.
 */
function toReviewStats(stats: BarReviewStats | null) {
  if (!stats) {
    return {
      totalCount: 0,
      averageRating: 0,
      distribution: [1, 2, 3, 4, 5].map((r) => ({ rating: r, count: 0 })),
    };
  }
  return {
    totalCount: stats.reviewCount,
    averageRating: Number(stats.ratingAvg),
    distribution: [
      { rating: 1, count: stats.rating1Count },
      { rating: 2, count: stats.rating2Count },
      { rating: 3, count: stats.rating3Count },
      { rating: 4, count: stats.rating4Count },
      { rating: 5, count: stats.rating5Count },
    ],
  };
}

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
    private readonly s3Client: S3Client,
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
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
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

  /**
   * 리뷰 사진을 업로드한다.
   */
  async uploadPhotos(
    reviewId: number,
    files: Express.Multer.File[],
    user: { id: number },
  ): Promise<ReviewPhoto[]> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.userId !== user.id) {
      throw new ForbiddenException('You can only upload photos to your own review.');
    }

    const existingCount = await this.reviewPhotoRepository.count({
      where: { reviewId },
    });

    if (existingCount + files.length > 5) {
      throw new BadRequestException(
        'A review can have at most 5 photos.',
      );
    }

    const uploadResults = await Promise.allSettled(
      files.map((file) => this.s3Client.uploadReviewPhoto(file, reviewId)),
    );

    const successfulUploads: { url: string; s3Key: string; file: Express.Multer.File }[] = [];
    for (let i = 0; i < uploadResults.length; i++) {
      const result = uploadResults[i];
      if (result.status === 'fulfilled') {
        successfulUploads.push({ ...result.value, file: files[i] });
      }
    }

    if (successfulUploads.length === 0) {
      throw new BadRequestException('Failed to upload photos.');
    }

    const hadPhotos = review.photoCount > 0;

    try {
      return await runInTransaction(this.dataSource, async (manager) => {
        const photos: ReviewPhoto[] = [];
        for (let i = 0; i < successfulUploads.length; i++) {
          const { url, s3Key, file } = successfulUploads[i];
          const photo = manager.create(ReviewPhoto, {
            reviewId,
            url,
            s3Key,
            mimeType: file.mimetype || null,
            sizeBytes: file.size || null,
            sortOrder: existingCount + i,
          });
          photos.push(await manager.save(photo));
        }

        review.photoCount = existingCount + successfulUploads.length;
        await manager.save(review);

        if (
          !hadPhotos &&
          review.photoCount > 0 &&
          review.status === ReviewStatus.PUBLISHED
        ) {
          await this.reviewStatsService.adjustPhotoReviewCount(
            review.barId,
            1,
            manager,
          );
        }

        return photos;
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Photo sort order conflict. Please retry.');
      }
      throw error;
    }
  }

  /**
   * 리뷰 사진을 삭제한다 (soft delete).
   */
  async removePhoto(
    reviewId: number,
    photoId: number,
    user: { id: number },
  ): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.userId !== user.id) {
      throw new ForbiddenException('You can only delete photos from your own review.');
    }

    const photo = await this.reviewPhotoRepository.findOne({
      where: { id: photoId, reviewId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }

    await runInTransaction(this.dataSource, async (manager) => {
      await manager.softRemove(photo);

      review.photoCount = Math.max(0, review.photoCount - 1);
      await manager.save(review);

      if (review.photoCount === 0 && review.status === ReviewStatus.PUBLISHED) {
        await this.reviewStatsService.adjustPhotoReviewCount(
          review.barId,
          -1,
          manager,
        );
      }
    });
  }
}
