import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Role, ReviewStatus } from '@my-project/shared';
import { Review } from '../entities/review.entity.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminBarsService } from './admin-bars.service.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminReviewsService } from './admin-reviews.service.js';
import { AdminActionsService } from './admin-actions.service.js';
import { AdminBarsQueryDto } from './dto/admin-bars-query.dto.js';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto.js';
import { AdminActionsQueryDto } from './dto/admin-actions-query.dto.js';

/**
 * 관리자 기능 파사드. 5개 세부 서비스에 위임한다.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly dashboardService: AdminDashboardService,
    private readonly barsService: AdminBarsService,
    private readonly usersService: AdminUsersService,
    private readonly reviewsService: AdminReviewsService,
    private readonly actionsService: AdminActionsService,
  ) {}

  /** 대시보드 통계를 조회한다. */
  getDashboard() {
    return this.dashboardService.getDashboard();
  }

  /** 관리자용 가게 목록을 조회한다. */
  findBars(query: AdminBarsQueryDto) {
    return this.barsService.findBars(query);
  }

  /** 관리자용 가게 상세를 조회한다. */
  findBarById(id: number) {
    return this.barsService.findBarById(id);
  }

  /** 가게를 승인한다. */
  approveBar(barId: number, adminId: number, reason?: string) {
    return this.barsService.approveBar(barId, adminId, reason);
  }

  /** 가게를 거절한다. */
  rejectBar(barId: number, adminId: number, reason: string) {
    return this.barsService.rejectBar(barId, adminId, reason);
  }

  /** 가게를 삭제한다 (soft delete). */
  deleteBar(barId: number, adminId: number, reason?: string) {
    return this.barsService.deleteBar(barId, adminId, reason);
  }

  /** 관리자용 유저 목록을 조회한다. */
  findUsers(query: AdminUsersQueryDto) {
    return this.usersService.findUsers(query);
  }

  /** 관리자용 유저 상세를 조회한다. */
  findUserById(id: number) {
    return this.usersService.findUserById(id);
  }

  /** 유저를 정지한다. */
  suspendUser(userId: number, adminId: number, reason: string) {
    return this.usersService.suspendUser(userId, adminId, reason);
  }

  /** 유저를 활성화한다. */
  activateUser(userId: number, adminId: number) {
    return this.usersService.activateUser(userId, adminId);
  }

  /** 유저 역할을 변경한다. */
  changeUserRole(userId: number, adminId: number, role: Role, reason?: string) {
    return this.usersService.changeUserRole(userId, adminId, role, reason);
  }

  /** 리뷰 상태를 변경한다 (moderation). */
  moderateReview(reviewId: number, status: ReviewStatus, adminId: number, reason?: string) {
    return this.reviewsService.moderateReview(reviewId, status, adminId, reason);
  }

  /** 트랜잭션 내부에서 리뷰 상태를 변경한다. */
  moderateReviewWithManager(
    review: Review,
    status: ReviewStatus,
    adminId: number,
    reason: string | undefined,
    manager: EntityManager,
  ) {
    return this.reviewsService.moderateReviewWithManager(review, status, adminId, reason, manager);
  }

  /** 리뷰를 관리자 권한으로 삭제한다 (soft delete). */
  deleteReviewByAdmin(reviewId: number, adminId: number, reason?: string) {
    return this.reviewsService.deleteReviewByAdmin(reviewId, adminId, reason);
  }

  /** 트랜잭션 내부에서 리뷰를 삭제한다. */
  deleteReviewWithManager(
    review: Review,
    adminId: number,
    reason: string | undefined,
    manager: EntityManager,
  ) {
    return this.reviewsService.deleteReviewWithManager(review, adminId, reason, manager);
  }

  /** 감사 로그 목록을 조회한다. */
  findActions(query: AdminActionsQueryDto) {
    return this.actionsService.findActions(query);
  }
}
