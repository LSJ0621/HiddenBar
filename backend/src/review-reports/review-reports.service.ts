import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReviewReport } from '../entities/review-report.entity.js';
import { Review } from '../entities/review.entity.js';
import { ReviewStatsService } from '../reviews/review-stats.service.js';
import { AdminService } from '../admin/admin.service.js';
import { runInTransaction } from '../common/utils/transaction.js';
import { ReviewStatus, ReportStatus, ReportResolution } from '@my-project/shared';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ListReportsQueryDto } from './dto/list-reports-query.dto.js';

/**
 * 리뷰 신고 접수 및 관리 서비스.
 */
@Injectable()
export class ReviewReportsService {
  constructor(
    @InjectRepository(ReviewReport)
    private readonly reportRepository: Repository<ReviewReport>,
    private readonly reviewStatsService: ReviewStatsService,
    private readonly adminService: AdminService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 리뷰 신고를 접수한다. 트랜잭션으로 신고 레코드 생성 + 리뷰 상태 전이 + 집계 보정을 처리한다.
   */
  async submitReport(reviewId: number, userId: number, dto: CreateReportDto) {
    return runInTransaction(this.dataSource, async (manager) => {
      // 1. SELECT FOR UPDATE로 리뷰 조회
      const review = await manager.findOne(Review, {
        where: { id: reviewId },
        lock: { mode: 'pessimistic_write' },
      });

      // 2. 존재 여부 + 상태 검증 (HIDDEN/삭제 → 404로 통합)
      if (!review) {
        throw new NotFoundException('Review not found.');
      }
      if (review.status === ReviewStatus.HIDDEN) {
        throw new NotFoundException('Review not found.');
      }

      // 3. 본인 리뷰 신고 차단
      if (review.userId === userId) {
        throw new ForbiddenException('You cannot report your own review.');
      }

      // 4. 신고 레코드 생성
      const normalizedDetail = dto.detail?.trim() || null;
      const report = manager.create(ReviewReport, {
        reviewId,
        reporterUserId: userId,
        reason: dto.reason,
        detail: normalizedDetail,
        status: ReportStatus.PENDING,
      });

      try {
        await manager.save(report);
      } catch (error: any) {
        if (error?.code === '23505') {
          throw new ConflictException('You have already reported this review.');
        }
        throw error;
      }

      // 5. PUBLISHED → REPORTED 전이 + 집계 보정
      if (review.status === ReviewStatus.PUBLISHED) {
        review.status = ReviewStatus.REPORTED;
        await manager.save(review);
        await this.reviewStatsService.decrementStats(
          review.barId,
          review.rating,
          review.photoCount > 0,
          manager,
        );
      }

      return {
        reviewId,
        status: review.status,
        reportId: report.id,
        createdAt: report.createdAt,
      };
    });
  }

  /**
   * 관리자용 신고 목록을 조회한다. 페이지네이션 및 status 필터를 지원한다.
   */
  async findReports(query: ListReportsQueryDto) {
    const { page = 1, limit = 20, status } = query;

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.review', 'review')
      .withDeleted()
      .orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('report.status = :status', { status });
    }

    const [items, totalItems] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  /**
   * 관리자용 신고 상세를 조회한다. 리뷰 본문, 작성자, 신고자 정보를 포함한다.
   */
  async findReportById(reportId: number) {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['reporter', 'review', 'review.user', 'processedByAdmin'],
      withDeleted: true,
    });

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return report;
  }

  /**
   * 관리자가 신고를 처리한다. 트랜잭션으로 리뷰 moderation + 신고 일괄 RESOLVED + 처리 정보 저장을 수행한다.
   */
  async resolveReport(
    reportId: number,
    adminId: number,
    dto: { action: ReportResolution; note?: string },
  ) {
    return runInTransaction(this.dataSource, async (manager) => {
      // 1. SELECT FOR UPDATE로 report 조회 + PENDING 확인
      const report = await manager.findOne(ReviewReport, {
        where: { id: reportId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!report) {
        throw new NotFoundException('Report not found.');
      }

      if (report.status !== ReportStatus.PENDING) {
        throw new ConflictException('Report is already resolved.');
      }

      // 2. SELECT FOR UPDATE로 리뷰 조회
      const review = await manager.findOne(Review, {
        where: { id: report.reviewId },
        lock: { mode: 'pessimistic_write' },
        withDeleted: true,
      });

      // 3. 리뷰 현재 상태에 따라 moderation 실행 또는 skip
      if (review) {
        const isAlreadyDeleted = !!review.deletedAt;

        if (dto.action === ReportResolution.RESTORED) {
          if (review.status !== ReviewStatus.PUBLISHED && !isAlreadyDeleted) {
            await this.adminService.moderateReviewWithManager(
              review,
              ReviewStatus.PUBLISHED,
              adminId,
              dto.note,
              manager,
            );
          }
        } else if (dto.action === ReportResolution.HIDDEN) {
          if (review.status !== ReviewStatus.HIDDEN && !isAlreadyDeleted) {
            await this.adminService.moderateReviewWithManager(
              review,
              ReviewStatus.HIDDEN,
              adminId,
              dto.note,
              manager,
            );
          }
        } else if (dto.action === ReportResolution.DELETED) {
          if (!isAlreadyDeleted) {
            await this.adminService.deleteReviewWithManager(
              review,
              adminId,
              dto.note,
              manager,
            );
          }
        }
      }

      // 4. 동일 reviewId의 모든 PENDING report → RESOLVED 일괄 업데이트
      await manager.update(
        ReviewReport,
        { reviewId: report.reviewId, status: ReportStatus.PENDING },
        {
          status: ReportStatus.RESOLVED,
          resolution: dto.action,
          resolutionNote: dto.note ?? null,
          processedByAdminId: adminId,
          processedAt: new Date(),
        },
      );
    });
  }
}
