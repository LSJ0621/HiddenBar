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
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminBarsService } from './admin-bars.service.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminReviewsService } from './admin-reviews.service.js';
import { AdminActionsService } from './admin-actions.service.js';
import { AdminController } from './admin.controller.js';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { BarsModule } from '../bars/bars.module.js';

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
    BarsModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminDashboardService,
    AdminBarsService,
    AdminUsersService,
    AdminReviewsService,
    AdminActionsService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
