import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Review } from '../entities/review.entity.js';
import { ReviewPhoto } from '../entities/review-photo.entity.js';
import { BarReviewStats } from '../entities/bar-review-stats.entity.js';
import { Bar } from '../entities/bar.entity.js';
import { AwsModule } from '../external/aws/aws.module.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewStatsService } from './review-stats.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ReviewPhoto, BarReviewStats, Bar]),
    AwsModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewStatsService],
  exports: [ReviewsService, ReviewStatsService],
})
export class ReviewsModule implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * partial unique index를 생성한다.
   * TypeORM synchronize는 WHERE 조건부 유니크 인덱스를 지원하지 않으므로 직접 생성한다.
   */
  async onModuleInit(): Promise<void> {
    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_bar_active
        ON reviews ("userId", "barId") WHERE "deletedAt" IS NULL
    `);
    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_review_photos_review_order_active
        ON review_photos ("reviewId", "sortOrder") WHERE "deletedAt" IS NULL
    `);
  }
}
