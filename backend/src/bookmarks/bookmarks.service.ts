import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from '../entities/bookmark.entity.js';
import { Bar } from '../entities/bar.entity.js';
import { BarPhoto } from '../entities/bar-photo.entity.js';
import { BarStatus } from '@my-project/shared';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { BarReviewStats } from '../entities/bar-review-stats.entity.js';
import { extractThumbnail } from '../common/utils/photo-utils.js';
import { buildPaginationMeta } from '../common/utils/pagination.js';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(Bar)
    private readonly barRepository: Repository<Bar>,
  ) {}

  /**
   * 북마크를 추가한다. 이미 존재하면 그대로 반환 (멱등).
   */
  async add(
    barId: number,
    userId: number,
  ): Promise<{ isBookmarked: boolean; bookmarkCount: number }> {
    const bar = await this.barRepository.findOne({
      where: { id: barId, status: BarStatus.APPROVED },
    });
    if (!bar) {
      throw new NotFoundException(
        'Only approved bars can be bookmarked.',
      );
    }

    const existing = await this.bookmarkRepository.findOne({
      where: { barId, userId },
    });

    if (!existing) {
      // soft-deleted 레코드가 있으면 restore, 없으면 새로 생성
      const softDeleted = await this.bookmarkRepository.findOne({
        where: { barId, userId },
        withDeleted: true,
      });

      if (softDeleted) {
        await this.bookmarkRepository.restore(softDeleted.id);
      } else {
        const bookmark = this.bookmarkRepository.create({ barId, userId });
        await this.bookmarkRepository.save(bookmark);
      }
    }

    const bookmarkCount = await this.bookmarkRepository.count({
      where: { barId },
    });

    return { isBookmarked: true, bookmarkCount };
  }

  /**
   * 북마크를 제거한다. 이미 없으면 그대로 반환 (멱등).
   */
  async remove(
    barId: number,
    userId: number,
  ): Promise<{ isBookmarked: boolean; bookmarkCount: number }> {
    const existing = await this.bookmarkRepository.findOne({
      where: { barId, userId },
    });

    if (existing) {
      await this.bookmarkRepository.softDelete(existing.id);
    }

    const bookmarkCount = await this.bookmarkRepository.count({
      where: { barId },
    });

    return { isBookmarked: false, bookmarkCount };
  }

  /**
   * 사용자의 북마크 목록을 조회한다.
   */
  async findUserBookmarks(userId: number, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;

    const qb = this.bookmarkRepository
      .createQueryBuilder('bookmark')
      .innerJoinAndSelect('bookmark.bar', 'bar')
      .leftJoin('bar.photos', 'photo')
      .addSelect(['photo.url', 'photo.order'])
      .leftJoin('bar.reviewStats', 'reviewStats')
      .addSelect(['reviewStats.ratingAvg', 'reviewStats.reviewCount'])
      .loadRelationCountAndMap('bar.bookmarkCount', 'bar.bookmarks')
      .where('bookmark.userId = :userId', { userId })
      .andWhere('bar.status = :status', { status: BarStatus.APPROVED })
      .orderBy('bookmark.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, totalItems] = await qb.getManyAndCount();

    const mappedItems = items.map((bookmark) => {
      const bookmarkWithBar = bookmark as Bookmark & {
        bar: Bar & {
          photos?: BarPhoto[];
          bookmarkCount?: number;
          reviewStats?: BarReviewStats;
        };
      };
      const bar = bookmarkWithBar.bar;
      const photos = bar.photos || [];
      const thumbnail = extractThumbnail(photos);
      return {
        id: bar.id,
        name: bar.name,
        city: bar.city,
        country: bar.country,
        thumbnail,
        bookmarkCount: bar.bookmarkCount ?? 0,
        averageRating: bar.reviewStats ? Number(bar.reviewStats.ratingAvg) || 0 : 0,
        reviewCount: bar.reviewStats?.reviewCount ?? 0,
        bookmarkedAt: bookmarkWithBar.createdAt,
      };
    });

    return {
      items: mappedItems,
      meta: buildPaginationMeta(page, limit, totalItems),
    };
  }
}
