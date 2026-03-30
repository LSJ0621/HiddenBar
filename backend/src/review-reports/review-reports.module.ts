import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewReport } from '../entities/review-report.entity.js';
import { Review } from '../entities/review.entity.js';
import { ReviewReportsService } from './review-reports.service.js';
import { ReviewReportsController } from './review-reports.controller.js';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { AdminModule } from '../admin/admin.module.js';

/**
 * 리뷰 신고 모듈. 신고 접수 및 관리자 처리 기능을 제공한다.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewReport, Review]),
    ReviewsModule,
    AdminModule,
  ],
  controllers: [ReviewReportsController],
  providers: [ReviewReportsService],
  exports: [ReviewReportsService],
})
export class ReviewReportsModule {}
