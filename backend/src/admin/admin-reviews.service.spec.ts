import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminReviewsService } from './admin-reviews.service.js';
import { Review } from '../entities/review.entity.js';
import { ReviewPhoto } from '../entities/review-photo.entity.js';
import { ReviewStatsService } from '../reviews/review-stats.service.js';
import { AdminActionType, ReviewStatus } from '@my-project/shared';
import { AdminTargetType } from './admin-target-type.js';
import { createAdminAction } from './admin-action.helper.js';

jest.mock('./admin-action.helper.js', () => ({
  createAdminAction: jest.fn().mockResolvedValue({}),
}));

const mockedCreateAdminAction = createAdminAction as jest.MockedFunction<
  typeof createAdminAction
>;

const mockReviewRepository = () => ({
  findOne: jest.fn(),
});

const mockReviewStatsService = () => ({
  incrementStats: jest.fn(),
  decrementStats: jest.fn(),
  adjustRating: jest.fn(),
  adjustPhotoReviewCount: jest.fn(),
  recalculate: jest.fn(),
});

const mockManager = () => ({
  save: jest.fn((entity: any) => Promise.resolve({ id: 1, ...entity })),
  create: jest.fn((_Entity: any, dto: any) => dto),
  softRemove: jest
    .fn()
    .mockImplementation((entity: any) => Promise.resolve(entity)),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
});

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

describe('AdminReviewsService', () => {
  let service: AdminReviewsService;
  let reviewRepo: ReturnType<typeof mockReviewRepository>;
  let statsService: ReturnType<typeof mockReviewStatsService>;
  let manager: ReturnType<typeof mockManager>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  const adminId = 99;

  const makeReview = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    barId: 10,
    userId: 2,
    rating: 4,
    photoCount: 1,
    status: ReviewStatus.PUBLISHED,
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });

  beforeEach(async () => {
    manager = mockManager();
    dataSource = createMockDataSource(manager);
    statsService = mockReviewStatsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReviewsService,
        { provide: getRepositoryToken(Review), useFactory: mockReviewRepository },
        { provide: ReviewStatsService, useValue: statsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AdminReviewsService>(AdminReviewsService);
    reviewRepo = module.get(getRepositoryToken(Review));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── moderateReview ──────────────────────────────────────

  describe('moderateReview', () => {
    it('존재하지 않는 reviewId → NotFoundException', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(
        service.moderateReview(999, ReviewStatus.HIDDEN, adminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('동일 상태로 변경 시도 → ConflictException', async () => {
      reviewRepo.findOne.mockResolvedValue(
        makeReview({ status: ReviewStatus.HIDDEN }),
      );

      await expect(
        service.moderateReview(1, ReviewStatus.HIDDEN, adminId),
      ).rejects.toThrow(ConflictException);
    });

    it('정상 호출 시 트랜잭션을 실행한다', async () => {
      reviewRepo.findOne.mockResolvedValue(
        makeReview({ status: ReviewStatus.PUBLISHED }),
      );

      await service.moderateReview(1, ReviewStatus.HIDDEN, adminId);

      const qr = dataSource.createQueryRunner();
      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });
  });

  // ─── moderateReviewWithManager ───────────────────────────

  describe('moderateReviewWithManager', () => {
    it('PUBLISHED → HIDDEN: decrementStats를 호출한다', async () => {
      const review = makeReview({ status: ReviewStatus.PUBLISHED });

      await service.moderateReviewWithManager(
        review as any,
        ReviewStatus.HIDDEN,
        adminId,
        undefined,
        manager as any,
      );

      expect(statsService.decrementStats).toHaveBeenCalledWith(
        review.barId,
        review.rating,
        true,
        manager,
      );
      expect(statsService.incrementStats).not.toHaveBeenCalled();
    });

    it('HIDDEN → PUBLISHED: incrementStats를 호출한다', async () => {
      const review = makeReview({ status: ReviewStatus.HIDDEN });

      await service.moderateReviewWithManager(
        review as any,
        ReviewStatus.PUBLISHED,
        adminId,
        undefined,
        manager as any,
      );

      expect(statsService.incrementStats).toHaveBeenCalledWith(
        review.barId,
        review.rating,
        true,
        manager,
      );
      expect(statsService.decrementStats).not.toHaveBeenCalled();
    });

    it('HIDDEN → HIDDEN 이외의 비발행 상태: stats 메서드를 호출하지 않는다', async () => {
      const review = makeReview({ status: ReviewStatus.HIDDEN });

      await service.moderateReviewWithManager(
        review as any,
        ReviewStatus.REPORTED,
        adminId,
        undefined,
        manager as any,
      );

      expect(statsService.incrementStats).not.toHaveBeenCalled();
      expect(statsService.decrementStats).not.toHaveBeenCalled();
    });

    it('상태 변경 후 manager.save(review)를 호출한다', async () => {
      const review = makeReview({ status: ReviewStatus.PUBLISHED });

      await service.moderateReviewWithManager(
        review as any,
        ReviewStatus.HIDDEN,
        adminId,
        undefined,
        manager as any,
      );

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReviewStatus.HIDDEN }),
      );
    });

    it('PUBLISHED로 변경 시 actionType이 REVIEW_RESTORED이다', async () => {
      const review = makeReview({ status: ReviewStatus.HIDDEN });

      await service.moderateReviewWithManager(
        review as any,
        ReviewStatus.PUBLISHED,
        adminId,
        undefined,
        manager as any,
      );

      expect(mockedCreateAdminAction).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          actionType: AdminActionType.REVIEW_RESTORED,
        }),
      );
    });

    it('HIDDEN으로 변경 시 actionType이 REVIEW_HIDDEN이다', async () => {
      const review = makeReview({ status: ReviewStatus.PUBLISHED });

      await service.moderateReviewWithManager(
        review as any,
        ReviewStatus.HIDDEN,
        adminId,
        undefined,
        manager as any,
      );

      expect(mockedCreateAdminAction).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          actionType: AdminActionType.REVIEW_HIDDEN,
        }),
      );
    });

    it('감사 로그에 previousStatus, newStatus, barId가 포함된다', async () => {
      const review = makeReview({ status: ReviewStatus.PUBLISHED, barId: 42 });

      await service.moderateReviewWithManager(
        review as any,
        ReviewStatus.HIDDEN,
        adminId,
        undefined,
        manager as any,
      );

      expect(mockedCreateAdminAction).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          targetType: AdminTargetType.REVIEW,
          targetId: review.id,
          adminId,
          metadata: {
            previousStatus: ReviewStatus.PUBLISHED,
            newStatus: ReviewStatus.HIDDEN,
            barId: 42,
          },
        }),
      );
    });

    it('reason이 전달되면 감사 로그에 포함된다', async () => {
      const review = makeReview({ status: ReviewStatus.PUBLISHED });

      await service.moderateReviewWithManager(
        review as any,
        ReviewStatus.HIDDEN,
        adminId,
        'Inappropriate content',
        manager as any,
      );

      expect(mockedCreateAdminAction).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          reason: 'Inappropriate content',
        }),
      );
    });

    it('id, status, updatedAt을 반환한다', async () => {
      const review = makeReview({
        id: 7,
        status: ReviewStatus.HIDDEN,
        updatedAt: new Date('2026-04-01'),
      });

      const result = await service.moderateReviewWithManager(
        review as any,
        ReviewStatus.PUBLISHED,
        adminId,
        undefined,
        manager as any,
      );

      expect(result).toEqual({
        id: 7,
        status: ReviewStatus.PUBLISHED,
        updatedAt: new Date('2026-04-01'),
      });
    });
  });

  // ─── deleteReviewByAdmin ─────────────────────────────────

  describe('deleteReviewByAdmin', () => {
    it('존재하지 않는 reviewId → NotFoundException', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteReviewByAdmin(999, adminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('정상 호출 시 트랜잭션을 실행한다', async () => {
      reviewRepo.findOne.mockResolvedValue(makeReview());

      await service.deleteReviewByAdmin(1, adminId);

      const qr = dataSource.createQueryRunner();
      expect(qr.connect).toHaveBeenCalled();
      expect(qr.startTransaction).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });
  });

  // ─── deleteReviewWithManager ─────────────────────────────

  describe('deleteReviewWithManager', () => {
    it('ReviewPhoto를 soft delete한다', async () => {
      const review = makeReview();

      await service.deleteReviewWithManager(
        review as any,
        adminId,
        undefined,
        manager as any,
      );

      expect(manager.update).toHaveBeenCalledWith(
        ReviewPhoto,
        { reviewId: review.id },
        { deletedAt: expect.any(Date) },
      );
    });

    it('review를 softRemove한다', async () => {
      const review = makeReview();

      await service.deleteReviewWithManager(
        review as any,
        adminId,
        undefined,
        manager as any,
      );

      expect(manager.softRemove).toHaveBeenCalledWith(review);
    });

    it('PUBLISHED 리뷰 삭제 시 decrementStats를 호출한다', async () => {
      const review = makeReview({ status: ReviewStatus.PUBLISHED });

      await service.deleteReviewWithManager(
        review as any,
        adminId,
        undefined,
        manager as any,
      );

      expect(statsService.decrementStats).toHaveBeenCalledWith(
        review.barId,
        review.rating,
        true,
        manager,
      );
    });

    it('HIDDEN 리뷰 삭제 시 decrementStats를 호출하지 않는다', async () => {
      const review = makeReview({ status: ReviewStatus.HIDDEN });

      await service.deleteReviewWithManager(
        review as any,
        adminId,
        undefined,
        manager as any,
      );

      expect(statsService.decrementStats).not.toHaveBeenCalled();
    });

    it('감사 로그에 REVIEW_DELETED actionType과 barId/userId/rating metadata가 포함된다', async () => {
      const review = makeReview({
        barId: 10,
        userId: 2,
        rating: 4,
      });

      await service.deleteReviewWithManager(
        review as any,
        adminId,
        undefined,
        manager as any,
      );

      expect(mockedCreateAdminAction).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          actionType: AdminActionType.REVIEW_DELETED,
          targetType: AdminTargetType.REVIEW,
          targetId: review.id,
          adminId,
          metadata: {
            barId: 10,
            userId: 2,
            rating: 4,
          },
        }),
      );
    });

    it('reason이 전달되면 감사 로그에 포함된다', async () => {
      const review = makeReview();

      await service.deleteReviewWithManager(
        review as any,
        adminId,
        'Spam review',
        manager as any,
      );

      expect(mockedCreateAdminAction).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          reason: 'Spam review',
        }),
      );
    });
  });
});
