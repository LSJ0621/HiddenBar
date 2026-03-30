import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewsService } from './reviews.service.js';
import { ReviewStatsService } from './review-stats.service.js';
import { Review } from '../entities/review.entity.js';
import { ReviewPhoto } from '../entities/review-photo.entity.js';
import { Bar } from '../entities/bar.entity.js';
import { BarReviewStats } from '../entities/bar-review-stats.entity.js';
import { S3Client } from '../external/aws/clients/s3.client.js';
import { BarStatus, ReviewStatus, Role } from '@my-project/shared';

const mockReviewRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn((dto: any) => dto),
  save: jest.fn((entity: any) => Promise.resolve({ id: 1, ...entity })),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockReviewPhotoRepo = () => ({
  findOne: jest.fn(),
  count: jest.fn(),
  find: jest.fn(),
});

const mockBarRepo = () => ({
  findOne: jest.fn(),
});

const mockBarReviewStatsRepo = () => ({
  findOne: jest.fn(),
});

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
  query: jest.fn(),
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

const mockS3Client = () => ({
  uploadReviewPhoto: jest.fn().mockResolvedValue({
    url: 'https://mock-s3.example.com/reviews/1/test.jpg',
    s3Key: 'hiddenbar/reviews/1/test.jpg',
  }),
});

const mockReviewStatsService = () => ({
  incrementStats: jest.fn(),
  decrementStats: jest.fn(),
  adjustRating: jest.fn(),
  adjustPhotoReviewCount: jest.fn(),
  recalculate: jest.fn(),
});

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewRepo: ReturnType<typeof mockReviewRepo>;
  let reviewPhotoRepo: ReturnType<typeof mockReviewPhotoRepo>;
  let barRepo: ReturnType<typeof mockBarRepo>;
  let barReviewStatsRepo: ReturnType<typeof mockBarReviewStatsRepo>;
  let statsService: ReturnType<typeof mockReviewStatsService>;
  let manager: ReturnType<typeof mockManager>;
  let s3: ReturnType<typeof mockS3Client>;

  const mockUser = { id: 1, role: Role.USER };
  const mockAdmin = { id: 99, role: Role.ADMIN };

  beforeEach(async () => {
    manager = mockManager();
    const ds = createMockDataSource(manager);
    s3 = mockS3Client();
    statsService = mockReviewStatsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useFactory: mockReviewRepo },
        { provide: getRepositoryToken(ReviewPhoto), useFactory: mockReviewPhotoRepo },
        { provide: getRepositoryToken(Bar), useFactory: mockBarRepo },
        { provide: getRepositoryToken(BarReviewStats), useFactory: mockBarReviewStatsRepo },
        { provide: ReviewStatsService, useValue: statsService },
        { provide: DataSource, useValue: ds },
        { provide: S3Client, useValue: s3 },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    reviewRepo = module.get(getRepositoryToken(Review));
    reviewPhotoRepo = module.get(getRepositoryToken(ReviewPhoto));
    barRepo = module.get(getRepositoryToken(Bar));
    barReviewStatsRepo = module.get(getRepositoryToken(BarReviewStats));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── create ─────────────────────────────────────────────

  describe('create', () => {
    const dto = { barId: 1, rating: 4, content: 'Great bar!' };

    it('인증된 사용자가 APPROVED 바에 리뷰를 생성한다', async () => {
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      reviewRepo.findOne
        .mockResolvedValueOnce(null) // 중복 체크
        .mockResolvedValueOnce({
          id: 1, userId: 1, barId: 1, rating: 4, content: 'Great bar!',
          visitedAt: null, status: ReviewStatus.PUBLISHED,
          createdAt: new Date(), updatedAt: new Date(),
          user: { id: 1, name: 'Test', profileImage: null },
          photos: [],
        }); // 재조회

      const result = await service.create(dto, mockUser);

      expect(result).toBeDefined();
      expect(result.author).toBeDefined();
      expect(manager.create).toHaveBeenCalled();
      expect(manager.save).toHaveBeenCalled();
      expect(statsService.incrementStats).toHaveBeenCalledWith(1, 4, false, manager);
    });

    it('바가 없으면 404 NotFoundException', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('바가 APPROVED가 아니면 404 NotFoundException', async () => {
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.PENDING });

      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('같은 사용자 같은 바 활성 리뷰 존재 시 409 ConflictException', async () => {
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      reviewRepo.findOne.mockResolvedValue({ id: 1, userId: 1, barId: 1 });

      await expect(service.create(dto, mockUser)).rejects.toThrow(ConflictException);
    });

    it('DB unique violation(race condition) 시 409 ConflictException', async () => {
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.APPROVED });
      reviewRepo.findOne.mockResolvedValue(null);
      const dbError = new Error('duplicate key value violates unique constraint');
      (dbError as any).code = '23505';
      manager.save.mockRejectedValueOnce(dbError);

      await expect(service.create(dto, mockUser)).rejects.toThrow(ConflictException);
    });
  });

  // ─── findByBarId ────────────────────────────────────────

  describe('findByBarId', () => {
    const query = { page: 1, limit: 20 };

    const mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    it('PUBLISHED + deletedAt IS NULL만 반환한다', async () => {
      barRepo.findOne.mockResolvedValue({
        id: 1,
        status: BarStatus.APPROVED,
        ownerId: 2,
      });
      reviewRepo.createQueryBuilder.mockReturnValue(mockQb);
      barReviewStatsRepo.findOne.mockResolvedValue(null);

      const result = await service.findByBarId(1, query, mockUser);

      expect(result.items).toEqual([]);
      expect(result.meta).toBeDefined();
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'review.status = :status',
        { status: ReviewStatus.PUBLISHED },
      );
    });

    it('페이지네이션 meta 구조를 검증한다', async () => {
      barRepo.findOne.mockResolvedValue({
        id: 1,
        status: BarStatus.APPROVED,
        ownerId: 2,
      });
      mockQb.getManyAndCount.mockResolvedValue([[], 50]);
      reviewRepo.createQueryBuilder.mockReturnValue(mockQb);
      barReviewStatsRepo.findOne.mockResolvedValue(null);

      const result = await service.findByBarId(1, { page: 2, limit: 10 }, mockUser);

      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        totalItems: 50,
        totalPages: 5,
      });
    });

    it('stats 포함을 검증한다', async () => {
      barRepo.findOne.mockResolvedValue({
        id: 1,
        status: BarStatus.APPROVED,
        ownerId: 2,
      });
      reviewRepo.createQueryBuilder.mockReturnValue(mockQb);
      barReviewStatsRepo.findOne.mockResolvedValue({
        barId: 1,
        reviewCount: 10,
        ratingAvg: 4.2,
        rating1Count: 0,
        rating2Count: 1,
        rating3Count: 2,
        rating4Count: 3,
        rating5Count: 4,
        photoReviewCount: 5,
      });

      const result = await service.findByBarId(1, query, mockUser);

      expect(result.stats).toEqual({
        totalCount: 10,
        averageRating: 4.2,
        distribution: [
          { rating: 1, count: 0 },
          { rating: 2, count: 1 },
          { rating: 3, count: 2 },
          { rating: 4, count: 3 },
          { rating: 5, count: 4 },
        ],
      });
    });

    it('stats가 null이면 빈 기본값을 반환한다', async () => {
      barRepo.findOne.mockResolvedValue({
        id: 1,
        status: BarStatus.APPROVED,
        ownerId: 2,
      });
      reviewRepo.createQueryBuilder.mockReturnValue(mockQb);
      barReviewStatsRepo.findOne.mockResolvedValue(null);

      const result = await service.findByBarId(1, query, mockUser);

      expect(result.stats).toEqual({
        totalCount: 0,
        averageRating: 0,
        distribution: [
          { rating: 1, count: 0 },
          { rating: 2, count: 0 },
          { rating: 3, count: 0 },
          { rating: 4, count: 0 },
          { rating: 5, count: 0 },
        ],
      });
    });

    it('admin 사용자는 HIDDEN/REPORTED 리뷰도 조회 가능하다', async () => {
      barRepo.findOne.mockResolvedValue({
        id: 1,
        status: BarStatus.APPROVED,
        ownerId: 2,
      });
      const adminQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(adminQb);
      barReviewStatsRepo.findOne.mockResolvedValue(null);

      await service.findByBarId(1, query, mockAdmin);

      const statusFilterCalls = adminQb.andWhere.mock.calls.filter(
        (call: any[]) => call[0] === 'review.status = :status',
      );
      expect(statusFilterCalls.length).toBe(0);
    });

    it('바 오너(ownerId === user.id)도 PUBLISHED 리뷰만 조회한다', async () => {
      // Arrange: 요청 사용자와 ownerId가 동일한 바
      const ownerUser = { id: 1, role: Role.USER };
      barRepo.findOne.mockResolvedValue({
        id: 1,
        status: BarStatus.APPROVED,
        ownerId: ownerUser.id,
      });
      const ownerQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(ownerQb);
      barReviewStatsRepo.findOne.mockResolvedValue(null);

      // Act
      await service.findByBarId(1, query, ownerUser);

      // Assert: 바 오너라도 PUBLISHED 필터가 적용되어야 한다
      expect(ownerQb.andWhere).toHaveBeenCalledWith(
        'review.status = :status',
        { status: ReviewStatus.PUBLISHED },
      );
    });
  });

  // ─── findMyReview ───────────────────────────────────────

  describe('findMyReview', () => {
    it('내 리뷰가 없으면 null을 반환한다', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      const result = await service.findMyReview(1, mockUser.id);

      expect(result).toBeNull();
    });

    it('내 리뷰가 있으면 ReviewItem 형태로 반환한다', async () => {
      const review = {
        id: 1, barId: 1, userId: 1, rating: 4, content: 'Good',
        visitedAt: null, status: ReviewStatus.PUBLISHED,
        createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
        user: { id: 1, name: 'User', profileImage: 'https://img.example.com/1.jpg' },
        photos: [{ id: 10, url: 'https://photo.example.com/1.jpg', sortOrder: 0 }],
      };
      reviewRepo.findOne.mockResolvedValue(review);

      const result = await service.findMyReview(1, mockUser.id);

      expect(result).toEqual({
        id: 1,
        rating: 4,
        content: 'Good',
        visitedAt: null,
        status: ReviewStatus.PUBLISHED,
        author: { id: 1, name: 'User', profileImageUrl: 'https://img.example.com/1.jpg' },
        photos: [{ id: 10, url: 'https://photo.example.com/1.jpg', sortOrder: 0 }],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
    });

    it('user와 photos relation을 로드한다', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await service.findMyReview(1, mockUser.id);

      expect(reviewRepo.findOne).toHaveBeenCalledWith({
        where: { barId: 1, userId: mockUser.id },
        relations: ['user', 'photos'],
      });
    });
  });

  // ─── update ─────────────────────────────────────────────

  describe('update', () => {
    const existingReview = {
      id: 1,
      userId: 1,
      barId: 1,
      rating: 3,
      content: 'OK',
      status: ReviewStatus.PUBLISHED,
    };

    it('작성자 본인이 수정한다', async () => {
      reviewRepo.findOne
        .mockResolvedValueOnce({ ...existingReview }) // 기존 리뷰 조회
        .mockResolvedValueOnce({
          ...existingReview, content: 'Updated',
          user: { id: 1, name: 'Test', profileImage: null },
          photos: [],
          createdAt: new Date(), updatedAt: new Date(),
        }); // 재조회

      const result = await service.update(1, { content: 'Updated' }, mockUser);

      expect(result).toBeDefined();
      expect(result.author).toBeDefined();
      expect(manager.save).toHaveBeenCalled();
    });

    it('타인 리뷰 수정 시 403 ForbiddenException', async () => {
      reviewRepo.findOne.mockResolvedValue({ ...existingReview, userId: 999 });

      await expect(
        service.update(1, { content: 'Updated' }, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('삭제된 리뷰 수정 시 404', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, { content: 'Updated' }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('평점 변경 시 PUBLISHED 리뷰면 집계 보정한다', async () => {
      const reloaded = {
        ...existingReview, rating: 5,
        user: { id: 1, name: 'Test', profileImage: null },
        photos: [], createdAt: new Date(), updatedAt: new Date(),
      };
      reviewRepo.findOne
        .mockResolvedValueOnce({ ...existingReview })
        .mockResolvedValueOnce(reloaded);

      await service.update(1, { rating: 5 }, mockUser);

      expect(statsService.adjustRating).toHaveBeenCalledWith(1, 3, 5, manager);
    });

    it('HIDDEN 리뷰 평점 변경 시 집계 보정하지 않는다', async () => {
      const hidden = { ...existingReview, status: ReviewStatus.HIDDEN };
      const reloaded = {
        ...hidden, rating: 5,
        user: { id: 1, name: 'Test', profileImage: null },
        photos: [], createdAt: new Date(), updatedAt: new Date(),
      };
      reviewRepo.findOne
        .mockResolvedValueOnce(hidden)
        .mockResolvedValueOnce(reloaded);

      await service.update(1, { rating: 5 }, mockUser);

      expect(statsService.adjustRating).not.toHaveBeenCalled();
    });
  });

  // ─── remove ─────────────────────────────────────────────

  describe('remove', () => {
    const existingReview = {
      id: 1,
      userId: 1,
      barId: 1,
      rating: 4,
      photoCount: 2,
      status: ReviewStatus.PUBLISHED,
    };

    it('작성자 본인이 soft delete한다', async () => {
      reviewRepo.findOne.mockResolvedValue({ ...existingReview });

      await service.remove(1, mockUser);

      expect(manager.update).toHaveBeenCalledWith(
        ReviewPhoto,
        { reviewId: 1 },
        { deletedAt: expect.any(Date) },
      );
      expect(manager.softRemove).toHaveBeenCalled();
    });

    it('타인 리뷰 삭제 시 403', async () => {
      reviewRepo.findOne.mockResolvedValue({ ...existingReview, userId: 999 });

      await expect(service.remove(1, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('PUBLISHED 리뷰 삭제 시 집계 감소를 검증한다', async () => {
      reviewRepo.findOne.mockResolvedValue({ ...existingReview });

      await service.remove(1, mockUser);

      expect(statsService.decrementStats).toHaveBeenCalledWith(1, 4, true, manager);
    });

    it('HIDDEN 리뷰 삭제 시 집계 감소하지 않는다', async () => {
      reviewRepo.findOne.mockResolvedValue({
        ...existingReview,
        status: ReviewStatus.HIDDEN,
      });

      await service.remove(1, mockUser);

      expect(statsService.decrementStats).not.toHaveBeenCalled();
    });
  });

  // ─── uploadPhotos ───────────────────────────────────────

  describe('uploadPhotos', () => {
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from(''),
    } as Express.Multer.File;

    const existingReview = {
      id: 1,
      userId: 1,
      barId: 1,
      photoCount: 0,
    };

    it('사진 추가 성공 + photoCount 증가', async () => {
      reviewRepo.findOne.mockResolvedValue({ ...existingReview });
      reviewPhotoRepo.count.mockResolvedValue(0);

      const result = await service.uploadPhotos(1, [mockFile], mockUser);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });

    it('기존 + 새 사진 합계 5장 초과 시 400', async () => {
      reviewRepo.findOne.mockResolvedValue({ ...existingReview });
      reviewPhotoRepo.count.mockResolvedValue(4);

      await expect(
        service.uploadPhotos(1, [mockFile, mockFile], mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('PUBLISHED 리뷰 0→1 전환 시 photoReviewCount 증가', async () => {
      reviewRepo.findOne.mockResolvedValue({
        ...existingReview,
        photoCount: 0,
        status: ReviewStatus.PUBLISHED,
      });
      reviewPhotoRepo.count.mockResolvedValue(0);

      await service.uploadPhotos(1, [mockFile], mockUser);

      expect(statsService.adjustPhotoReviewCount).toHaveBeenCalledWith(1, 1, manager);
    });

    it('HIDDEN 리뷰 0→1 전환 시 photoReviewCount 증가하지 않는다', async () => {
      reviewRepo.findOne.mockResolvedValue({
        ...existingReview,
        photoCount: 0,
        status: ReviewStatus.HIDDEN,
      });
      reviewPhotoRepo.count.mockResolvedValue(0);

      await service.uploadPhotos(1, [mockFile], mockUser);

      expect(statsService.adjustPhotoReviewCount).not.toHaveBeenCalled();
    });
  });

  // ─── removePhoto ────────────────────────────────────────

  describe('removePhoto', () => {
    const existingReview = {
      id: 1,
      userId: 1,
      barId: 1,
      photoCount: 1,
    };

    it('사진 삭제 시 soft delete + photoCount 감소', async () => {
      reviewRepo.findOne.mockResolvedValue({ ...existingReview });
      reviewPhotoRepo.findOne.mockResolvedValue({ id: 10, reviewId: 1 });

      await service.removePhoto(1, 10, mockUser);

      expect(manager.softRemove).toHaveBeenCalled();
      expect(manager.save).toHaveBeenCalled();
    });

    it('PUBLISHED 리뷰 마지막 사진 삭제 시 photoReviewCount 감소', async () => {
      reviewRepo.findOne.mockResolvedValue({
        ...existingReview,
        status: ReviewStatus.PUBLISHED,
      });
      reviewPhotoRepo.findOne.mockResolvedValue({ id: 10, reviewId: 1 });

      await service.removePhoto(1, 10, mockUser);

      expect(statsService.adjustPhotoReviewCount).toHaveBeenCalledWith(1, -1, manager);
    });

    it('HIDDEN 리뷰 마지막 사진 삭제 시 photoReviewCount 감소하지 않는다', async () => {
      reviewRepo.findOne.mockResolvedValue({
        ...existingReview,
        photoCount: 1,
        status: ReviewStatus.HIDDEN,
      });
      reviewPhotoRepo.findOne.mockResolvedValue({ id: 10, reviewId: 1 });

      await service.removePhoto(1, 10, mockUser);

      expect(statsService.adjustPhotoReviewCount).not.toHaveBeenCalled();
    });

    it('사진이 없으면 404', async () => {
      reviewRepo.findOne.mockResolvedValue({ ...existingReview });
      reviewPhotoRepo.findOne.mockResolvedValue(null);

      await expect(service.removePhoto(1, 999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
