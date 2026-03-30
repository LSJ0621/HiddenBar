import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewReportsService } from './review-reports.service.js';
import { ReviewStatsService } from '../reviews/review-stats.service.js';
import { AdminService } from '../admin/admin.service.js';
import { ReviewReport } from '../entities/review-report.entity.js';
import { Review } from '../entities/review.entity.js';
import {
  ReportReason,
  ReportStatus,
  ReportResolution,
  ReviewStatus,
} from '@my-project/shared';

// ─── mock 팩토리 ────────────────────────────────────────────────────────────

const mockReportRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

/**
 * AdminService mock. moderateReviewWithManager, deleteReviewWithManager 호출 여부 검증에 사용된다.
 */
const mockAdminService = () => ({
  moderateReviewWithManager: jest.fn(),
  deleteReviewWithManager: jest.fn(),
});

/**
 * QueryBuilder 체이닝 mock. findReports의 createQueryBuilder 체인 검증에 사용된다.
 */
const createMockQueryBuilder = (result: [any[], number]) => {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  };
  return qb;
};

/**
 * EntityManager mock. reviews.service.spec.ts와 동일한 패턴으로 구성된다.
 */
const mockManager = () => ({
  save: jest.fn((entityOrClass: any, data?: any) => {
    const entity = data ?? entityOrClass;
    return Promise.resolve({ id: 1, ...entity });
  }),
  create: jest.fn((_entity: any, dto: any) => dto),
  findOne: jest.fn(),
  update: jest.fn(),
  softRemove: jest.fn((entity: any) =>
    Promise.resolve({ ...entity, deletedAt: new Date() }),
  ),
});

/**
 * DataSource mock. queryRunner를 통해 runInTransaction 유틸리티와 연동된다.
 */
const createMockDataSource = (mgr: ReturnType<typeof mockManager>) => ({
  createQueryRunner: jest.fn().mockReturnValue({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: mgr,
  }),
});

/**
 * ReviewStatsService mock. decrementStats 호출 여부 검증에 사용된다.
 */
const mockReviewStatsService = () => ({
  incrementStats: jest.fn(),
  decrementStats: jest.fn(),
  adjustRating: jest.fn(),
  adjustPhotoReviewCount: jest.fn(),
  recalculate: jest.fn(),
});

// ─── 공통 픽스처 ────────────────────────────────────────────────────────────

/** 신고 대상 PUBLISHED 리뷰 기본값 */
const makePublishedReview = (overrides: Partial<{
  id: number;
  userId: number;
  barId: number;
  rating: number;
  photoCount: number;
  status: ReviewStatus;
  deletedAt: Date | null;
}> = {}) => ({
  id: 10,
  userId: 99,   // 신고자(userId=1)와 다른 작성자
  barId: 1,
  rating: 4,
  photoCount: 0,
  status: ReviewStatus.PUBLISHED,
  deletedAt: null,
  ...overrides,
});

const REPORTER_USER_ID = 1;

const validDto = {
  reason: ReportReason.SPAM,
  detail: '광고성 게시글입니다',
};

// ─── describe ───────────────────────────────────────────────────────────────

describe('ReviewReportsService', () => {
  let service: ReviewReportsService;
  let reportRepo: ReturnType<typeof mockReportRepo>;
  let statsService: ReturnType<typeof mockReviewStatsService>;
  let adminService: ReturnType<typeof mockAdminService>;
  let manager: ReturnType<typeof mockManager>;

  beforeEach(async () => {
    manager = mockManager();
    const ds = createMockDataSource(manager);
    statsService = mockReviewStatsService();
    adminService = mockAdminService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewReportsService,
        { provide: getRepositoryToken(ReviewReport), useFactory: mockReportRepo },
        { provide: ReviewStatsService, useValue: statsService },
        { provide: AdminService, useValue: adminService },
        { provide: DataSource, useValue: ds },
      ],
    }).compile();

    service = module.get<ReviewReportsService>(ReviewReportsService);
    reportRepo = module.get(getRepositoryToken(ReviewReport));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── submitReport ──────────────────────────────────────────────────────────

  describe('submitReport', () => {
    /**
     * TC-1: PUBLISHED 리뷰 신고 성공
     * report 생성 + 리뷰 상태 REPORTED 전환 + decrementStats 호출
     */
    it('PUBLISHED 리뷰를 신고하면 report를 생성하고 리뷰 상태를 REPORTED로 변경하며 decrementStats를 호출한다', async () => {
      // Arrange
      const review = makePublishedReview({ photoCount: 0 });
      manager.findOne.mockResolvedValue(review);
      manager.create.mockReturnValue({ reporterUserId: REPORTER_USER_ID, ...validDto });
      manager.save
        .mockResolvedValueOnce({ id: 100, ...validDto, status: ReportStatus.PENDING }) // report 저장
        .mockResolvedValueOnce({ ...review, status: ReviewStatus.REPORTED });           // 리뷰 저장

      // Act
      await service.submitReport(review.id, REPORTER_USER_ID, validDto);

      // Assert: report 생성
      expect(manager.create).toHaveBeenCalledWith(
        ReviewReport,
        expect.objectContaining({
          reviewId: review.id,
          reporterUserId: REPORTER_USER_ID,
          reason: ReportReason.SPAM,
        }),
      );
      // Assert: 리뷰 상태 변경 저장
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReviewStatus.REPORTED }),
      );
      // Assert: 집계 감소 호출 (photoCount=0 → hasPhoto=false)
      expect(statsService.decrementStats).toHaveBeenCalledWith(
        review.barId,
        review.rating,
        false,
        manager,
      );
    });

    /**
     * TC-2: 이미 REPORTED 상태인 리뷰에 다른 사용자가 신고
     * report 생성은 되지만 리뷰 상태 재전환 및 decrementStats 미호출
     */
    it('이미 REPORTED 리뷰에 신고하면 report만 생성하고 리뷰 상태와 집계를 변경하지 않는다', async () => {
      // Arrange
      const review = makePublishedReview({ status: ReviewStatus.REPORTED });
      manager.findOne.mockResolvedValue(review);
      manager.create.mockReturnValue({ reporterUserId: REPORTER_USER_ID, ...validDto });
      manager.save.mockResolvedValueOnce({ id: 101, ...validDto, status: ReportStatus.PENDING });

      // Act
      await service.submitReport(review.id, REPORTER_USER_ID, validDto);

      // Assert: 리뷰 상태 save는 호출되지 않음
      expect(manager.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: ReviewStatus.REPORTED }),
      );
      // Assert: 집계 감소 미호출
      expect(statsService.decrementStats).not.toHaveBeenCalled();
    });

    /**
     * TC-3: 본인 리뷰 신고 → ForbiddenException
     */
    it('본인 리뷰를 신고하면 403 ForbiddenException을 던진다', async () => {
      // Arrange: review.userId === REPORTER_USER_ID
      const review = makePublishedReview({ userId: REPORTER_USER_ID });
      manager.findOne.mockResolvedValue(review);

      // Act & Assert
      await expect(
        service.submitReport(review.id, REPORTER_USER_ID, validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    /**
     * TC-4: 중복 신고 (unique constraint 위반, PostgreSQL error code '23505')
     * → ConflictException
     */
    it('동일 사용자가 같은 리뷰를 중복 신고하면 409 ConflictException을 던진다', async () => {
      // Arrange
      const review = makePublishedReview();
      manager.findOne.mockResolvedValue(review);
      manager.create.mockReturnValue({ reporterUserId: REPORTER_USER_ID, ...validDto });
      const dbError = new Error('duplicate key value violates unique constraint');
      (dbError as any).code = '23505';
      manager.save.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        service.submitReport(review.id, REPORTER_USER_ID, validDto),
      ).rejects.toThrow(ConflictException);
    });

    /**
     * TC-5: 존재하지 않는 리뷰 신고 → NotFoundException
     */
    it('존재하지 않는 리뷰를 신고하면 404 NotFoundException을 던진다', async () => {
      // Arrange
      manager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.submitReport(999, REPORTER_USER_ID, validDto),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * TC-6: HIDDEN 리뷰 신고 → NotFoundException (존재 노출 방지)
     */
    it('HIDDEN 리뷰를 신고하면 존재 노출 방지를 위해 404 NotFoundException을 던진다', async () => {
      // Arrange
      const review = makePublishedReview({ status: ReviewStatus.HIDDEN });
      manager.findOne.mockResolvedValue(review);

      // Act & Assert
      await expect(
        service.submitReport(review.id, REPORTER_USER_ID, validDto),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * TC-7: soft-deleted 리뷰 신고 (deletedAt이 있는 경우) → NotFoundException
     */
    it('soft-deleted 리뷰를 신고하면 404 NotFoundException을 던진다', async () => {
      // Arrange: findOne은 withDeleted 없이 조회하므로 null 반환
      manager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.submitReport(10, REPORTER_USER_ID, validDto),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * TC-8: detail 정규화 — trim 후 빈 문자열이면 null로 저장
     */
    it('detail이 공백만 있으면 null로 정규화하여 저장한다', async () => {
      // Arrange
      const review = makePublishedReview();
      manager.findOne.mockResolvedValue(review);
      manager.create.mockReturnValue({ reporterUserId: REPORTER_USER_ID, reason: ReportReason.SPAM, detail: null });
      manager.save.mockResolvedValueOnce({ id: 102, status: ReportStatus.PENDING });

      // Act
      await service.submitReport(review.id, REPORTER_USER_ID, {
        reason: ReportReason.SPAM,
        detail: '   ',  // 공백만 있는 detail
      });

      // Assert: create 호출 시 detail이 null로 정규화됨
      expect(manager.create).toHaveBeenCalledWith(
        ReviewReport,
        expect.objectContaining({ detail: null }),
      );
    });

    /**
     * TC-8b: detail이 undefined이면 null로 저장
     */
    it('detail이 없으면 null로 저장한다', async () => {
      // Arrange
      const review = makePublishedReview();
      manager.findOne.mockResolvedValue(review);
      manager.create.mockReturnValue({ reporterUserId: REPORTER_USER_ID, reason: ReportReason.SPAM, detail: null });
      manager.save.mockResolvedValueOnce({ id: 103, status: ReportStatus.PENDING });

      // Act
      await service.submitReport(review.id, REPORTER_USER_ID, {
        reason: ReportReason.SPAM,
      });

      // Assert
      expect(manager.create).toHaveBeenCalledWith(
        ReviewReport,
        expect.objectContaining({ detail: null }),
      );
    });

    /**
     * TC-1b: PUBLISHED 리뷰에 사진이 있는 경우 hasPhoto=true로 decrementStats 호출
     */
    it('PUBLISHED 리뷰에 사진이 있으면 hasPhoto=true로 decrementStats를 호출한다', async () => {
      // Arrange
      const review = makePublishedReview({ photoCount: 2 });
      manager.findOne.mockResolvedValue(review);
      manager.create.mockReturnValue({ reporterUserId: REPORTER_USER_ID, ...validDto });
      manager.save
        .mockResolvedValueOnce({ id: 104, status: ReportStatus.PENDING })
        .mockResolvedValueOnce({ ...review, status: ReviewStatus.REPORTED });

      // Act
      await service.submitReport(review.id, REPORTER_USER_ID, validDto);

      // Assert: hasPhoto=true
      expect(statsService.decrementStats).toHaveBeenCalledWith(
        review.barId,
        review.rating,
        true,
        manager,
      );
    });

    /**
     * findOne 호출 시 pessimistic_write lock을 사용한다
     */
    it('리뷰 조회 시 pessimistic_write lock을 사용한다', async () => {
      // Arrange
      const review = makePublishedReview();
      manager.findOne.mockResolvedValue(review);
      manager.create.mockReturnValue({ reporterUserId: REPORTER_USER_ID, ...validDto });
      manager.save.mockResolvedValueOnce({ id: 105, status: ReportStatus.PENDING });

      // Act
      await service.submitReport(review.id, REPORTER_USER_ID, validDto);

      // Assert
      expect(manager.findOne).toHaveBeenCalledWith(
        Review,
        expect.objectContaining({
          where: { id: review.id },
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });
  });

  // ─── findReports ──────────────────────────────────────────────────────────

  describe('findReports', () => {
    /**
     * TC-1: 페이지네이션 목록 조회 — reporter 정보 포함된 목록 반환
     */
    it('신고 목록을 조회하면 reporter 정보가 포함된 페이지네이션 결과를 반환한다', async () => {
      // Arrange
      const mockReport = {
        id: 1,
        reviewId: 10,
        reporterUserId: 1,
        reason: ReportReason.SPAM,
        status: ReportStatus.PENDING,
        reporter: { id: 1, email: 'user@example.com', name: 'User' },
        createdAt: new Date(),
      };
      const qb = createMockQueryBuilder([[mockReport], 1]);
      reportRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).findReports({ page: 1, limit: 20 });

      // Assert
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toMatchObject({ page: 1, limit: 20, totalItems: 1 });
      expect(qb.leftJoinAndSelect).toHaveBeenCalled();
      expect(qb.getManyAndCount).toHaveBeenCalled();
    });

    /**
     * TC-2: status 필터링 — PENDING 신고만 반환
     */
    it('status 필터를 PENDING으로 지정하면 PENDING 신고만 조회한다', async () => {
      // Arrange
      const qb = createMockQueryBuilder([[], 0]);
      reportRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).findReports({ page: 1, limit: 20, status: ReportStatus.PENDING });

      // Assert: where 또는 andWhere로 status 필터가 적용되어야 한다
      const whereCallArgs = [
        ...qb.where.mock.calls,
        ...qb.andWhere.mock.calls,
      ].flat();
      const hasStatusFilter = whereCallArgs.some(
        (arg) => typeof arg === 'string' && arg.includes('status'),
      );
      expect(hasStatusFilter).toBe(true);
    });
  });

  // ─── findReportById ───────────────────────────────────────────────────────

  describe('findReportById', () => {
    /**
     * TC-1: 상세 조회 — 리뷰 본문, 작성자, 신고자 정보 포함
     */
    it('유효한 ID로 조회하면 리뷰 본문·작성자·신고자가 포함된 신고 상세를 반환한다', async () => {
      // Arrange
      const mockReport = {
        id: 1,
        reviewId: 10,
        reason: ReportReason.SPAM,
        status: ReportStatus.PENDING,
        reporter: { id: 1, name: 'Reporter', email: 'r@example.com' },
        review: {
          id: 10,
          content: '리뷰 내용',
          rating: 4,
          user: { id: 99, name: 'Author', email: 'a@example.com' },
        },
        createdAt: new Date(),
      };
      reportRepo.findOne.mockResolvedValue(mockReport);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (service as any).findReportById(1);

      // Assert
      expect(result).toEqual(mockReport);
      expect(reportRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    /**
     * TC-2: 없는 ID 조회 → NotFoundException
     */
    it('존재하지 않는 ID로 조회하면 NotFoundException을 던진다', async () => {
      // Arrange
      reportRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect((service as any).findReportById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── resolveReport ────────────────────────────────────────────────────────

  describe('resolveReport', () => {
    const ADMIN_ID = 7;

    /** PENDING 상태의 기본 신고 픽스처 */
    const makePendingReport = (overrides: Partial<{
      id: number;
      reviewId: number;
      status: ReportStatus;
      resolution: ReportResolution | null;
      processedByAdminId: number | null;
      processedAt: Date | null;
      resolutionNote: string | null;
    }> = {}) => ({
      id: 1,
      reviewId: 10,
      status: ReportStatus.PENDING,
      resolution: null,
      processedByAdminId: null,
      processedAt: null,
      resolutionNote: null,
      ...overrides,
    });

    /** PUBLISHED 상태의 기본 리뷰 픽스처 */
    const makeReview = (overrides: Partial<{
      id: number;
      barId: number;
      userId: number;
      rating: number;
      status: ReviewStatus;
      deletedAt: Date | null;
      photoCount: number;
    }> = {}) => ({
      id: 10,
      barId: 1,
      userId: 99,
      rating: 4,
      status: ReviewStatus.PUBLISHED,
      deletedAt: null,
      photoCount: 0,
      ...overrides,
    });

    /**
     * TC-1: RESTORE — 모든 PENDING report → RESOLVED, moderateReviewWithManager(PUBLISHED) 호출
     */
    it('RESTORE 액션이면 moderateReviewWithManager를 PUBLISHED 상태로 호출하고 report를 RESOLVED로 일괄 처리한다', async () => {
      // Arrange
      const report = makePendingReport();
      const review = makeReview({ status: ReviewStatus.REPORTED });
      // SELECT FOR UPDATE로 report 조회 → review 조회 순으로 두 번 호출
      manager.findOne
        .mockResolvedValueOnce(report)  // report
        .mockResolvedValueOnce(review); // review
      manager.update.mockResolvedValue({ affected: 2 });
      adminService.moderateReviewWithManager.mockResolvedValue({
        id: review.id,
        status: ReviewStatus.PUBLISHED,
        updatedAt: new Date(),
      });

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).resolveReport(report.id, ADMIN_ID, {
        action: ReportResolution.RESTORED,
        note: '정상 리뷰 확인',
      });

      // Assert: moderateReviewWithManager를 PUBLISHED로 호출
      expect(adminService.moderateReviewWithManager).toHaveBeenCalledWith(
        expect.objectContaining({ id: review.id }),
        ReviewStatus.PUBLISHED,
        ADMIN_ID,
        expect.any(String),
        expect.anything(), // EntityManager
      );
      // Assert: 동일 reviewId의 PENDING report를 RESOLVED로 일괄 업데이트
      expect(manager.update).toHaveBeenCalledWith(
        ReviewReport,
        expect.objectContaining({ reviewId: review.id, status: ReportStatus.PENDING }),
        expect.objectContaining({
          status: ReportStatus.RESOLVED,
          resolution: ReportResolution.RESTORED,
          processedByAdminId: ADMIN_ID,
          processedAt: expect.any(Date),
        }),
      );
    });

    /**
     * TC-2: HIDE — moderateReviewWithManager(HIDDEN) 호출
     */
    it('HIDE 액션이면 moderateReviewWithManager를 HIDDEN 상태로 호출한다', async () => {
      // Arrange
      const report = makePendingReport();
      const review = makeReview({ status: ReviewStatus.REPORTED });
      manager.findOne
        .mockResolvedValueOnce(report)
        .mockResolvedValueOnce(review);
      manager.update.mockResolvedValue({ affected: 1 });
      adminService.moderateReviewWithManager.mockResolvedValue({
        id: review.id,
        status: ReviewStatus.HIDDEN,
        updatedAt: new Date(),
      });

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).resolveReport(report.id, ADMIN_ID, {
        action: ReportResolution.HIDDEN,
        note: '부적절한 내용 확인',
      });

      // Assert
      expect(adminService.moderateReviewWithManager).toHaveBeenCalledWith(
        expect.objectContaining({ id: review.id }),
        ReviewStatus.HIDDEN,
        ADMIN_ID,
        expect.any(String),
        expect.anything(),
      );
    });

    /**
     * TC-3: DELETE — deleteReviewWithManager 호출
     */
    it('DELETE 액션이면 deleteReviewWithManager를 호출한다', async () => {
      // Arrange
      const report = makePendingReport();
      const review = makeReview({ status: ReviewStatus.REPORTED });
      manager.findOne
        .mockResolvedValueOnce(report)
        .mockResolvedValueOnce(review);
      manager.update.mockResolvedValue({ affected: 1 });
      adminService.deleteReviewWithManager.mockResolvedValue(undefined);

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).resolveReport(report.id, ADMIN_ID, {
        action: ReportResolution.DELETED,
        note: '삭제 처리',
      });

      // Assert
      expect(adminService.deleteReviewWithManager).toHaveBeenCalledWith(
        expect.objectContaining({ id: review.id }),
        ADMIN_ID,
        expect.any(String),
        expect.anything(),
      );
    });

    /**
     * TC-4: 이미 RESOLVED 상태 → ConflictException
     */
    it('이미 RESOLVED 상태인 report를 처리하면 ConflictException을 던진다', async () => {
      // Arrange
      const resolvedReport = makePendingReport({ status: ReportStatus.RESOLVED });
      manager.findOne.mockResolvedValueOnce(resolvedReport);

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(
        (service as any).resolveReport(resolvedReport.id, ADMIN_ID, {
          action: ReportResolution.RESTORED,
        }),
      ).rejects.toThrow(ConflictException);
    });

    /**
     * TC-5: 없는 report ID → NotFoundException
     */
    it('존재하지 않는 report ID로 처리하면 NotFoundException을 던진다', async () => {
      // Arrange
      manager.findOne.mockResolvedValueOnce(null);

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(
        (service as any).resolveReport(999, ADMIN_ID, { action: ReportResolution.RESTORED }),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * TC-6: 처리 정보 저장 — processedByAdminId, processedAt, resolutionNote 기록
     */
    it('처리 완료 후 processedByAdminId, processedAt, resolutionNote가 저장된다', async () => {
      // Arrange
      const report = makePendingReport();
      const review = makeReview({ status: ReviewStatus.REPORTED });
      manager.findOne
        .mockResolvedValueOnce(report)
        .mockResolvedValueOnce(review);
      manager.update.mockResolvedValue({ affected: 1 });
      adminService.moderateReviewWithManager.mockResolvedValue({
        id: review.id,
        status: ReviewStatus.PUBLISHED,
        updatedAt: new Date(),
      });

      const resolutionNote = '처리 메모입니다';

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).resolveReport(report.id, ADMIN_ID, {
        action: ReportResolution.RESTORED,
        note: resolutionNote,
      });

      // Assert: update 호출 시 처리 정보가 포함됨
      expect(manager.update).toHaveBeenCalledWith(
        ReviewReport,
        expect.any(Object),
        expect.objectContaining({
          processedByAdminId: ADMIN_ID,
          processedAt: expect.any(Date),
          resolutionNote,
        }),
      );
    });

    /**
     * TC-7: 리뷰가 이미 목표 상태 (기존 API로 선처리) → moderation skip, report만 RESOLVED
     * RESTORE 액션인데 리뷰가 이미 PUBLISHED이면 moderateReviewWithManager를 호출하지 않는다
     */
    it('RESTORE 액션이고 리뷰가 이미 PUBLISHED이면 moderation을 skip하고 report만 RESOLVED로 처리한다', async () => {
      // Arrange: 리뷰가 이미 PUBLISHED
      const report = makePendingReport();
      const review = makeReview({ status: ReviewStatus.PUBLISHED });
      manager.findOne
        .mockResolvedValueOnce(report)
        .mockResolvedValueOnce(review);
      manager.update.mockResolvedValue({ affected: 1 });

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).resolveReport(report.id, ADMIN_ID, {
        action: ReportResolution.RESTORED,
      });

      // Assert: moderation 호출 없음
      expect(adminService.moderateReviewWithManager).not.toHaveBeenCalled();
      // Assert: report는 RESOLVED 처리됨
      expect(manager.update).toHaveBeenCalledWith(
        ReviewReport,
        expect.objectContaining({ reviewId: review.id, status: ReportStatus.PENDING }),
        expect.objectContaining({ status: ReportStatus.RESOLVED }),
      );
    });

    /**
     * TC-8: 리뷰가 이미 삭제된 상태 (deletedAt 있음) → moderation skip, report만 RESOLVED
     */
    it('리뷰가 이미 soft-delete 상태이면 moderation을 skip하고 report만 RESOLVED로 처리한다', async () => {
      // Arrange: 리뷰가 deletedAt이 있는 상태 (DELETE 액션)
      const report = makePendingReport();
      const review = makeReview({ deletedAt: new Date() });
      manager.findOne
        .mockResolvedValueOnce(report)
        .mockResolvedValueOnce(review);
      manager.update.mockResolvedValue({ affected: 1 });

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).resolveReport(report.id, ADMIN_ID, {
        action: ReportResolution.DELETED,
      });

      // Assert: deleteReviewWithManager 호출 없음
      expect(adminService.deleteReviewWithManager).not.toHaveBeenCalled();
      // Assert: report는 RESOLVED 처리됨
      expect(manager.update).toHaveBeenCalledWith(
        ReviewReport,
        expect.objectContaining({ reviewId: review.id, status: ReportStatus.PENDING }),
        expect.objectContaining({ status: ReportStatus.RESOLVED }),
      );
    });
  });
});
