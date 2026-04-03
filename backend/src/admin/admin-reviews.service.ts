import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Review } from '../entities/review.entity.js';
import { ReviewPhoto } from '../entities/review-photo.entity.js';
import { ReviewStatsService } from '../reviews/review-stats.service.js';
import {
  AdminActionType,
  ReviewStatus,
} from '@my-project/shared';
import { runInTransaction } from '../common/utils/transaction.js';
import { createAdminAction } from './admin-action.helper.js';
import { AdminTargetType } from './admin-target-type.js';

@Injectable()
export class AdminReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly reviewStatsService: ReviewStatsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 리뷰 상태를 변경한다 (moderation). 트랜잭션으로 상태 변경 + 집계 보정 + 감사 로그를 기록한다.
   */
  async moderateReview(
    reviewId: number,
    status: ReviewStatus,
    adminId: number,
    reason?: string,
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.status === status) {
      throw new ConflictException('Review already has this status.');
    }

    return runInTransaction(this.dataSource, async (manager) => {
      return this.moderateReviewWithManager(review, status, adminId, reason, manager);
    });
  }

  /**
   * 트랜잭션 내부에서 리뷰 상태를 변경한다. 외부 트랜잭션에서 호출 가능하다.
   */
  async moderateReviewWithManager(
    review: Review,
    status: ReviewStatus,
    adminId: number,
    reason: string | undefined,
    manager: EntityManager,
  ): Promise<{ id: number; status: ReviewStatus; updatedAt: Date }> {
    const previousStatus = review.status;
    const wasPublished = previousStatus === ReviewStatus.PUBLISHED;
    const willBePublished = status === ReviewStatus.PUBLISHED;

    review.status = status;
    await manager.save(review);

    if (wasPublished && !willBePublished) {
      await this.reviewStatsService.decrementStats(
        review.barId,
        review.rating,
        review.photoCount > 0,
        manager,
      );
    } else if (!wasPublished && willBePublished) {
      await this.reviewStatsService.incrementStats(
        review.barId,
        review.rating,
        review.photoCount > 0,
        manager,
      );
    }

    const actionType =
      status === ReviewStatus.PUBLISHED
        ? AdminActionType.REVIEW_RESTORED
        : AdminActionType.REVIEW_HIDDEN;

    await createAdminAction(manager, {
      actionType,
      targetType: AdminTargetType.REVIEW,
      targetId: review.id,
      adminId,
      reason,
      metadata: { previousStatus, newStatus: status, barId: review.barId },
    });

    return { id: review.id, status, updatedAt: review.updatedAt };
  }

  /**
   * 리뷰를 관리자 권한으로 삭제한다 (soft delete). 트랜잭션으로 삭제 + 집계 감소 + 감사 로그를 기록한다.
   */
  async deleteReviewByAdmin(
    reviewId: number,
    adminId: number,
    reason?: string,
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    await runInTransaction(this.dataSource, async (manager) => {
      return this.deleteReviewWithManager(review, adminId, reason, manager);
    });
  }

  /**
   * 트랜잭션 내부에서 리뷰를 삭제한다. 외부 트랜잭션에서 호출 가능하다.
   */
  async deleteReviewWithManager(
    review: Review,
    adminId: number,
    reason: string | undefined,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(
      ReviewPhoto,
      { reviewId: review.id },
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

    await createAdminAction(manager, {
      actionType: AdminActionType.REVIEW_DELETED,
      targetType: AdminTargetType.REVIEW,
      targetId: review.id,
      adminId,
      reason,
      metadata: {
        barId: review.barId,
        userId: review.userId,
        rating: review.rating,
      },
    });
  }
}
