import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bar } from '../entities/bar.entity.js';
import { User } from '../entities/user.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { AdminAction } from '../entities/admin-action.entity.js';
import { Review } from '../entities/review.entity.js';
import { ReviewPhoto } from '../entities/review-photo.entity.js';
import { BarReviewStats } from '../entities/bar-review-stats.entity.js';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { ReviewsModule } from '../reviews/reviews.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bar,
      User,
      Bookmark,
      RefreshToken,
      AdminAction,
      Review,
      ReviewPhoto,
      BarReviewStats,
    ]),
    ReviewsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
