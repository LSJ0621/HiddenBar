import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { BarReviewStats } from '../entities/bar-review-stats.entity.js';

/**
 * 바 리뷰 통계를 원자적으로 관리하는 서비스.
 */
@Injectable()
export class ReviewStatsService {
  constructor(
    @InjectRepository(BarReviewStats)
    private readonly statsRepository: Repository<BarReviewStats>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * rating 값(1~5)에 대응하는 quoted 컬럼명을 반환한다.
   */
  private ratingColName(rating: number): string {
    return `"rating${rating}Count"`;
  }

  /**
   * 리뷰 생성 시 통계를 증가시킨다.
   */
  async incrementStats(
    barId: number,
    rating: number,
    hasPhotos: boolean,
    manager: EntityManager,
  ): Promise<void> {
    const ratingCol = this.ratingColName(rating);
    const photoInc = hasPhotos ? 1 : 0;

    await manager.query(
      `
      INSERT INTO bar_review_stats ("barId", "reviewCount", ${ratingCol}, "ratingSum", "ratingAvg", "photoReviewCount", "updatedAt")
      VALUES ($1, 1, 1, $2::int, $2::numeric, $3, NOW())
      ON CONFLICT ("barId") DO UPDATE SET
        "reviewCount" = bar_review_stats."reviewCount" + 1,
        ${ratingCol} = bar_review_stats.${ratingCol} + 1,
        "ratingSum" = bar_review_stats."ratingSum" + $2::int,
        "ratingAvg" = CASE
          WHEN bar_review_stats."reviewCount" + 1 > 0
          THEN (bar_review_stats."ratingSum" + $2::numeric)::numeric / (bar_review_stats."reviewCount" + 1)
          ELSE 0
        END,
        "photoReviewCount" = bar_review_stats."photoReviewCount" + $3,
        "updatedAt" = NOW()
      `,
      [barId, rating, photoInc],
    );
  }

  /**
   * 리뷰 삭제 시 통계를 감소시킨다.
   */
  async decrementStats(
    barId: number,
    rating: number,
    hasPhotos: boolean,
    manager: EntityManager,
  ): Promise<void> {
    const ratingCol = this.ratingColName(rating);
    const photoDec = hasPhotos ? 1 : 0;

    await manager.query(
      `
      UPDATE bar_review_stats SET
        "reviewCount" = GREATEST(0, "reviewCount" - 1),
        ${ratingCol} = GREATEST(0, ${ratingCol} - 1),
        "ratingSum" = GREATEST(0, "ratingSum" - $2::int),
        "ratingAvg" = CASE
          WHEN GREATEST(0, "reviewCount" - 1) > 0
          THEN (GREATEST(0, "ratingSum" - $2::numeric))::numeric / GREATEST(1, "reviewCount" - 1)
          ELSE 0
        END,
        "photoReviewCount" = GREATEST(0, "photoReviewCount" - $3),
        "updatedAt" = NOW()
      WHERE "barId" = $1
      `,
      [barId, rating, photoDec],
    );
  }

  /**
   * 리뷰 평점 변경 시 통계를 보정한다.
   */
  async adjustRating(
    barId: number,
    oldRating: number,
    newRating: number,
    manager: EntityManager,
  ): Promise<void> {
    const oldCol = this.ratingColName(oldRating);
    const newCol = this.ratingColName(newRating);

    await manager.query(
      `
      UPDATE bar_review_stats SET
        ${oldCol} = GREATEST(0, ${oldCol} - 1),
        ${newCol} = ${newCol} + 1,
        "ratingSum" = GREATEST(0, "ratingSum" - $2::int) + $3::int,
        "ratingAvg" = CASE
          WHEN "reviewCount" > 0
          THEN (GREATEST(0, "ratingSum" - $2::numeric) + $3::numeric)::numeric / "reviewCount"
          ELSE 0
        END,
        "updatedAt" = NOW()
      WHERE "barId" = $1
      `,
      [barId, oldRating, newRating],
    );
  }

  /**
   * 사진 리뷰 수를 조정한다.
   */
  async adjustPhotoReviewCount(
    barId: number,
    delta: number,
    manager: EntityManager,
  ): Promise<void> {
    await manager.query(
      `
      UPDATE bar_review_stats SET
        "photoReviewCount" = GREATEST(0, "photoReviewCount" + $2),
        "updatedAt" = NOW()
      WHERE "barId" = $1
      `,
      [barId, delta],
    );
  }

  /**
   * 원본 reviews 테이블 기준 전체 재집계한다. 복구/검증용.
   */
  async recalculate(barId: number): Promise<void> {
    await this.dataSource.query(
      `
      INSERT INTO bar_review_stats ("barId", "reviewCount", "ratingSum", "ratingAvg",
        "rating1Count", "rating2Count", "rating3Count", "rating4Count", "rating5Count",
        "photoReviewCount", "updatedAt")
      SELECT
        $1,
        COUNT(*),
        COALESCE(SUM(rating), 0),
        COALESCE(AVG(rating), 0),
        COUNT(*) FILTER (WHERE rating = 1),
        COUNT(*) FILTER (WHERE rating = 2),
        COUNT(*) FILTER (WHERE rating = 3),
        COUNT(*) FILTER (WHERE rating = 4),
        COUNT(*) FILTER (WHERE rating = 5),
        COUNT(*) FILTER (WHERE "photoCount" > 0),
        NOW()
      FROM reviews
      WHERE "barId" = $1 AND "deletedAt" IS NULL AND status = 'PUBLISHED'
      ON CONFLICT ("barId") DO UPDATE SET
        "reviewCount" = EXCLUDED."reviewCount",
        "ratingSum" = EXCLUDED."ratingSum",
        "ratingAvg" = EXCLUDED."ratingAvg",
        "rating1Count" = EXCLUDED."rating1Count",
        "rating2Count" = EXCLUDED."rating2Count",
        "rating3Count" = EXCLUDED."rating3Count",
        "rating4Count" = EXCLUDED."rating4Count",
        "rating5Count" = EXCLUDED."rating5Count",
        "photoReviewCount" = EXCLUDED."photoReviewCount",
        "updatedAt" = NOW()
      `,
      [barId],
    );
  }
}
