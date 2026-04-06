import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminDashboardService } from './admin-dashboard.service.js';
import { AdminBarsService } from './admin-bars.service.js';
import { AdminUsersService } from './admin-users.service.js';
import { AdminReviewsService } from './admin-reviews.service.js';
import { AdminActionsService } from './admin-actions.service.js';
import { Bar } from '../entities/bar.entity.js';
import { User } from '../entities/user.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { AdminAction } from '../entities/admin-action.entity.js';
import { Review } from '../entities/review.entity.js';
import { ReviewStatsService } from '../reviews/review-stats.service.js';
import { BarsService } from '../bars/bars.service.js';
import {
  BarStatus,
  Role,
  ReviewStatus,
  AdminActionType,
  AdminBarsSortBy,
} from '@my-project/shared';
import { DataSource, EntityManager } from 'typeorm';

const mockBarRepository = () => ({
  findOne: jest.fn(),
  softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn(),
  count: jest.fn(),
});

const mockUserRepository = () => ({
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
  count: jest.fn(),
});

const mockBookmarkRepository = () => ({
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockRefreshTokenRepository = () => ({
  delete: jest.fn(),
});

const mockAdminActionRepository = () => ({
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockReviewRepository = () => ({
  findOne: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
});

const mockReviewStatsService = () => ({
  incrementStats: jest.fn(),
  decrementStats: jest.fn(),
  adjustRating: jest.fn(),
  adjustPhotoReviewCount: jest.fn(),
  recalculate: jest.fn(),
});

const mockBarsService = () => ({
  softDeleteBarWithRelations: jest.fn().mockResolvedValue(undefined),
});

const mockDataSource = () => ({
  createQueryRunner: jest.fn().mockReturnValue({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn((entity: any) => Promise.resolve({ id: 1, ...entity })),
      create: jest.fn((_Entity: any, dto: any) => dto),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      softRemove: jest
        .fn()
        .mockImplementation((entity: any) => Promise.resolve(entity)),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    },
  }),
});

describe('AdminService', () => {
  let service: AdminService;
  let barRepo: ReturnType<typeof mockBarRepository>;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let bookmarkRepo: ReturnType<typeof mockBookmarkRepository>;
  let adminActionRepo: ReturnType<typeof mockAdminActionRepository>;
  let dataSource: ReturnType<typeof mockDataSource>;

  const mockAdmin = { id: 1, email: 'admin@example.com', role: Role.ADMIN };

  const mockBar = {
    id: 1,
    name: 'The Secret Bar',
    status: BarStatus.PENDING,
    ownerId: 2,
    country: 'Thailand',
    city: 'Bangkok',
    createdAt: new Date(),
    deletedAt: null,
  };

  const mockUser = {
    id: 2,
    email: 'user@example.com',
    name: 'TestUser',
    role: Role.USER,
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        AdminDashboardService,
        AdminBarsService,
        AdminUsersService,
        AdminReviewsService,
        AdminActionsService,
        { provide: getRepositoryToken(Bar), useFactory: mockBarRepository },
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        {
          provide: getRepositoryToken(Bookmark),
          useFactory: mockBookmarkRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useFactory: () => ({ delete: jest.fn() }),
        },
        {
          provide: getRepositoryToken(AdminAction),
          useFactory: mockAdminActionRepository,
        },
        {
          provide: getRepositoryToken(Review),
          useFactory: mockReviewRepository,
        },
        {
          provide: ReviewStatsService,
          useFactory: mockReviewStatsService,
        },
        {
          provide: BarsService,
          useFactory: mockBarsService,
        },
        { provide: DataSource, useFactory: mockDataSource },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    barRepo = module.get(getRepositoryToken(Bar));
    userRepo = module.get(getRepositoryToken(User));
    bookmarkRepo = module.get(getRepositoryToken(Bookmark));
    adminActionRepo = module.get(getRepositoryToken(AdminAction));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── getDashboard ──────────────────────────────────────

  /**
   * getDashboard에서 사용되는 모든 queryBuilder 체이닝을 지원하는 범용 mock
   */
  const createChainableQb = (overrides: Record<string, any> = {}) => {
    const qb: Record<string, jest.Mock> = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue(null),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
    };
    // 체이닝 유지: 모든 메서드가 qb 자신을 반환
    for (const key of Object.keys(qb)) {
      if (!['getCount', 'getRawOne', 'getRawMany', 'getMany'].includes(key)) {
        qb[key].mockReturnValue(qb);
      }
    }
    Object.assign(qb, overrides);
    return qb;
  };

  /** getDashboard 테스트에 필요한 모든 mock을 기본값으로 세팅 */
  const setupDashboardMocks = () => {
    barRepo.count.mockResolvedValue(0);
    userRepo.count.mockResolvedValue(0);
    bookmarkRepo.count.mockResolvedValue(0);

    const defaultQb = createChainableQb();
    barRepo.createQueryBuilder.mockReturnValue(defaultQb);
    userRepo.createQueryBuilder.mockReturnValue(defaultQb);
    bookmarkRepo.createQueryBuilder.mockReturnValue(defaultQb);
    adminActionRepo.createQueryBuilder.mockReturnValue(defaultQb);

    return defaultQb;
  };

  describe('getDashboard', () => {
    it('should return correct kpiCards bar counts', async () => {
      setupDashboardMocks();
      barRepo.count
        .mockResolvedValueOnce(500)  // totalBars
        .mockResolvedValueOnce(15)   // pendingBars
        .mockResolvedValueOnce(450)  // approvedBars
        .mockResolvedValueOnce(35);  // rejectedBars

      const result = await service.getDashboard();

      expect(result.kpiCards.totalBars).toBe(500);
      expect(result.kpiCards.pendingBars).toBe(15);
      expect(result.barStatusDistribution).toEqual({
        pending: 15,
        approved: 450,
        rejected: 35,
      });
    });

    it('should return correct totalUsers in kpiCards', async () => {
      setupDashboardMocks();
      userRepo.count.mockResolvedValueOnce(5000); // totalUsers

      const result = await service.getDashboard();

      expect(result.kpiCards.totalUsers).toBe(5000);
    });

    it('should return correct totalBookmarks in kpiCards', async () => {
      setupDashboardMocks();
      bookmarkRepo.count.mockResolvedValueOnce(12000);

      const result = await service.getDashboard();

      expect(result.kpiCards.totalBookmarks).toBe(12000);
    });

    it('should return topBookmarkedBars from database', async () => {
      setupDashboardMocks();

      const topBarsQb = createChainableQb({
        getRawMany: jest.fn().mockResolvedValue([
          { barId: 1, barName: 'Thai Bar', city: 'Bangkok', bookmarkCount: '150' },
          { barId: 2, barName: 'Viet Bar', city: 'Hanoi', bookmarkCount: '120' },
        ]),
      });
      // bookmarkRepo.createQueryBuilder 호출 순서: thisWeek, lastWeek, topBookmarkedBars
      const defaultQb = createChainableQb();
      bookmarkRepo.createQueryBuilder
        .mockReturnValueOnce(defaultQb)  // thisWeekBookmarks
        .mockReturnValueOnce(defaultQb)  // lastWeekBookmarks
        .mockReturnValueOnce(topBarsQb); // topBookmarkedBarsRaw

      const result = await service.getDashboard();

      expect(result.topBookmarkedBars).toEqual([
        { barId: 1, barName: 'Thai Bar', city: 'Bangkok', bookmarkCount: 150 },
        { barId: 2, barName: 'Viet Bar', city: 'Hanoi', bookmarkCount: 120 },
      ]);
    });

    it('should return change rates based on this/last week counts', async () => {
      setupDashboardMocks();

      // barRepo.createQueryBuilder 순서: thisWeekBars, lastWeekBars, avgPending, barRegistration, recentPending
      const thisWeekBarQb = createChainableQb({ getCount: jest.fn().mockResolvedValue(20) });
      const lastWeekBarQb = createChainableQb({ getCount: jest.fn().mockResolvedValue(10) });
      const defaultQb = createChainableQb();
      barRepo.createQueryBuilder
        .mockReturnValueOnce(thisWeekBarQb)
        .mockReturnValueOnce(lastWeekBarQb)
        .mockReturnValueOnce(defaultQb)  // avgPendingWaitResult
        .mockReturnValueOnce(defaultQb)  // barRegistrationRaw
        .mockReturnValueOnce(defaultQb); // recentPendingBars

      const result = await service.getDashboard();

      // (20 - 10) / 10 * 100 = 100
      expect(result.kpiCards.totalBarsChangeRate).toBe(100);
    });

    it('avgPendingWaitResult.avg가 null일 때 avgPendingWaitDays가 0이다', async () => {
      setupDashboardMocks();

      // barRepo.createQueryBuilder 순서: thisWeekBars, lastWeekBars, avgPending, barRegistration, recentPending
      const defaultQb = createChainableQb();
      const avgQb = createChainableQb({
        getRawOne: jest.fn().mockResolvedValue({ avg: null }),
      });
      barRepo.createQueryBuilder
        .mockReturnValueOnce(defaultQb)  // thisWeekBars
        .mockReturnValueOnce(defaultQb)  // lastWeekBars
        .mockReturnValueOnce(avgQb)      // avgPendingWaitResult (avg: null)
        .mockReturnValueOnce(defaultQb)  // barRegistrationRaw
        .mockReturnValueOnce(defaultQb); // recentPendingBars

      const result = await service.getDashboard();

      expect(result.kpiCards.avgPendingWaitDays).toBe(0);
    });

    it('lastWeek=0, thisWeek>0일 때 changeRate가 100이다', async () => {
      setupDashboardMocks();

      // barRepo: thisWeekBars=5, lastWeekBars=0
      const thisWeekBarQb = createChainableQb({ getCount: jest.fn().mockResolvedValue(5) });
      const lastWeekBarQb = createChainableQb({ getCount: jest.fn().mockResolvedValue(0) });
      const defaultQb = createChainableQb();
      barRepo.createQueryBuilder
        .mockReturnValueOnce(thisWeekBarQb)  // thisWeekBars
        .mockReturnValueOnce(lastWeekBarQb)  // lastWeekBars
        .mockReturnValueOnce(defaultQb)      // avgPendingWaitResult
        .mockReturnValueOnce(defaultQb)      // barRegistrationRaw
        .mockReturnValueOnce(defaultQb);     // recentPendingBars

      // userRepo: thisWeekUsers=5, lastWeekUsers=0
      const thisWeekUserQb = createChainableQb({ getCount: jest.fn().mockResolvedValue(5) });
      const lastWeekUserQb = createChainableQb({ getCount: jest.fn().mockResolvedValue(0) });
      userRepo.createQueryBuilder
        .mockReturnValueOnce(thisWeekUserQb)  // thisWeekUsers
        .mockReturnValueOnce(lastWeekUserQb); // lastWeekUsers

      const result = await service.getDashboard();

      expect(result.kpiCards.totalBarsChangeRate).toBe(100);
      expect(result.kpiCards.totalUsersChangeRate).toBe(100);
    });

    it('일요일(day=0)에도 올바르게 동작한다', async () => {
      // 2026-04-05는 일요일
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-05T12:00:00Z'));

      try {
        setupDashboardMocks();

        const result = await service.getDashboard();

        // 일요일일 때 이번 주 월요일은 2026-03-30 (6일 전)
        const expectedMonday = '2026-03-30';
        // barRegistrationTrend의 날짜가 30일 전부터 시작하는지 확인
        expect(result.barRegistrationTrend).toBeDefined();
        expect(result.barRegistrationTrend.length).toBe(30);

        // trend에 expectedMonday 날짜가 포함되어야 한다
        const mondayEntry = result.barRegistrationTrend.find(
          (item: { date: string }) => item.date === expectedMonday,
        );
        expect(mondayEntry).toBeDefined();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ─── findBars ──────────────────────────────────────────

  describe('findBars', () => {
    it('should return paginated list of bars with photoCount', async () => {
      const barWithPhotoCount = { ...mockBar, photoCount: 5 };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[barWithPhotoCount], 1]),
      };
      barRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findBars({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.items[0]).toHaveProperty('photoCount', 5);
      expect(qb.loadRelationCountAndMap).toHaveBeenCalledWith(
        'bar.photoCount',
        'bar.photos',
      );
    });

    it('should filter by status when provided', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findBars({ page: 1, limit: 20, status: BarStatus.PENDING });

      expect(qb.andWhere).toHaveBeenCalledWith('bar.status = :status', {
        status: BarStatus.PENDING,
      });
    });

    it('should filter by search query when provided', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findBars({ page: 1, limit: 20, q: 'secret' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(bar.name ILIKE :q OR bar.address ILIKE :q)',
        { q: '%secret%' },
      );
    });

    it('should filter by country when provided', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findBars({ page: 1, limit: 20, country: 'Thailand' });

      expect(qb.andWhere).toHaveBeenCalledWith('bar.country = :country', {
        country: 'Thailand',
      });
    });

    it('should sort by sortBy parameter', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findBars({
        page: 1,
        limit: 20,
        sortBy: AdminBarsSortBy.NAME,
      });

      expect(qb.orderBy).toHaveBeenCalledWith('bar.name', 'ASC');
    });
  });

  // ─── findBarById ───────────────────────────────────────

  describe('findBarById', () => {
    it('should return bar with relations and admin action history', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        owner: { id: 2, name: 'Test', email: 'user@example.com' },
        photos: [],
        menuItems: [],
        operatingHours: [],
      });
      bookmarkRepo.count.mockResolvedValue(42);
      adminActionRepo.find.mockResolvedValue([
        {
          actionType: AdminActionType.BAR_REJECTED,
          reason: 'Test reason',
          admin: { id: 1, name: 'admin1' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.findBarById(1);

      expect(result).toBeDefined();
      expect(result.bookmarkCount).toBe(42);
      expect(result.admin.actions).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent bar', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(service.findBarById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── approveBar ────────────────────────────────────────

  describe('approveBar', () => {
    it('should change bar status to APPROVED and create AdminAction log', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        status: BarStatus.PENDING,
      });
      const qr = dataSource.createQueryRunner();

      const result = await service.approveBar(1, mockAdmin.id, 'Looks good');

      expect(qr.manager.save).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(result.status).toBe(BarStatus.APPROVED);
    });

    it('should throw NotFoundException for non-existent bar', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(service.approveBar(999, mockAdmin.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when bar is already APPROVED', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        status: BarStatus.APPROVED,
      });

      await expect(service.approveBar(1, mockAdmin.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when bar status is REJECTED', async () => {
      barRepo.findOne.mockResolvedValue({ id: 1, status: BarStatus.REJECTED });

      await expect(service.approveBar(1, mockAdmin.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rollback transaction when error occurs during approval', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        status: BarStatus.PENDING,
      });
      const qr = dataSource.createQueryRunner();
      qr.manager.save.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.approveBar(1, mockAdmin.id)).rejects.toThrow(
        'DB error',
      );
      expect(qr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ─── rejectBar ─────────────────────────────────────────

  describe('rejectBar', () => {
    it('should change bar status to REJECTED and create AdminAction log with reason', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        status: BarStatus.PENDING,
      });
      const qr = dataSource.createQueryRunner();

      const result = await service.rejectBar(
        1,
        mockAdmin.id,
        'Bad quality photos and description',
      );

      expect(qr.manager.save).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(result.status).toBe(BarStatus.REJECTED);
    });

    it('should throw NotFoundException for non-existent bar', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(
        service.rejectBar(999, mockAdmin.id, 'Some reason here'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when bar is already REJECTED', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        status: BarStatus.REJECTED,
      });

      await expect(
        service.rejectBar(1, mockAdmin.id, 'Some reason here'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── deleteBar ─────────────────────────────────────────

  describe('deleteBar', () => {
    it('should soft delete bar and create AdminAction log', async () => {
      const barEntity = { ...mockBar, deletedAt: null };
      barRepo.findOne.mockResolvedValue(barEntity);
      const qr = dataSource.createQueryRunner();
      qr.manager.findOne.mockResolvedValue(barEntity);

      await service.deleteBar(1, mockAdmin.id, 'Spam listing');

      expect(qr.commitTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent bar', async () => {
      barRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteBar(999, mockAdmin.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when bar is already soft deleted', async () => {
      barRepo.findOne.mockResolvedValue({
        ...mockBar,
        deletedAt: new Date(),
      });

      await expect(service.deleteBar(1, mockAdmin.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── findUsers ─────────────────────────────────────────

  describe('findUsers', () => {
    it('should return paginated list of users with barCount and bookmarkCount', async () => {
      const userWithCounts = { ...mockUser, barCount: 3, bookmarkCount: 15 };
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[userWithCounts], 1]),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findUsers({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(result.items[0]).toHaveProperty('barCount', 3);
      expect(result.items[0]).toHaveProperty('bookmarkCount', 15);
      expect(qb.loadRelationCountAndMap).toHaveBeenCalledWith(
        'user.barCount',
        'user.bars',
      );
      expect(qb.loadRelationCountAndMap).toHaveBeenCalledWith(
        'user.bookmarkCount',
        'user.bookmarks',
      );
    });

    it('should filter by role when provided', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findUsers({ page: 1, limit: 20, role: Role.ADMIN });

      expect(qb.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: Role.ADMIN,
      });
    });

    it('should filter by isActive when provided', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findUsers({ page: 1, limit: 20, isActive: false });

      expect(qb.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', {
        isActive: false,
      });
    });

    it('should search by email/name when q is provided', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findUsers({ page: 1, limit: 20, q: 'test' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(user.email ILIKE :q OR user.name ILIKE :q)',
        { q: '%test%' },
      );
    });
  });

  // ─── findUserById ──────────────────────────────────────

  describe('findUserById', () => {
    it('should return user with simplified bars and admin action history', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        bars: [
          {
            id: 1,
            name: 'The Secret Bar',
            status: BarStatus.APPROVED,
            city: 'Bangkok',
            country: 'Thailand',
            description: 'should be excluded',
            address: 'should be excluded',
          },
        ],
      });
      adminActionRepo.find.mockResolvedValue([
        {
          actionType: AdminActionType.USER_ROLE_CHANGED,
          reason: 'Promoted',
          createdAt: new Date(),
        },
      ]);

      const result = await service.findUserById(2);

      expect(result).toBeDefined();
      expect(result.bars).toHaveLength(1);
      expect(result.bars[0]).toEqual({
        id: 1,
        name: 'The Secret Bar',
        status: BarStatus.APPROVED,
        city: 'Bangkok',
        country: 'Thailand',
      });
      expect(result.bars[0]).not.toHaveProperty('description');
      expect(result.bars[0]).not.toHaveProperty('address');
      expect(result.recentActions).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.findUserById(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── suspendUser ───────────────────────────────────────

  describe('suspendUser', () => {
    it('should set user isActive to false and create AdminAction log', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: true });
      const qr = dataSource.createQueryRunner();

      const result = await service.suspendUser(
        2,
        mockAdmin.id,
        'Violated terms of service',
      );

      expect(qr.manager.save).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });

    it('should delete all refresh tokens of suspended user (force logout)', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: true });
      const qr = dataSource.createQueryRunner();

      await service.suspendUser(2, mockAdmin.id, 'Violated terms of service');

      expect(qr.manager.delete).toHaveBeenCalledWith(RefreshToken, {
        userId: 2,
      });
    });

    it('should throw ForbiddenException when admin tries to suspend self', async () => {
      await expect(
        service.suspendUser(mockAdmin.id, mockAdmin.id, 'Cannot self suspend'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.suspendUser(999, mockAdmin.id, 'Some reason for suspension'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already suspended', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.suspendUser(2, mockAdmin.id, 'Already suspended user'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── activateUser ──────────────────────────────────────

  describe('activateUser', () => {
    it('should set user isActive to true and create AdminAction log', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: false });
      const qr = dataSource.createQueryRunner();

      const result = await service.activateUser(2, mockAdmin.id);

      expect(qr.manager.save).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.activateUser(999, mockAdmin.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when user is already active', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: true });

      await expect(service.activateUser(2, mockAdmin.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── changeUserRole ────────────────────────────────────

  describe('changeUserRole', () => {
    it('should change user role and create AdminAction log with metadata', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, role: Role.USER });
      const qr = dataSource.createQueryRunner();

      const result = await service.changeUserRole(
        2,
        mockAdmin.id,
        Role.ADMIN,
        'Promotion',
      );

      expect(qr.manager.save).toHaveBeenCalled();
      expect(qr.commitTransaction).toHaveBeenCalled();
      expect(result.role).toBe(Role.ADMIN);
    });

    it('should include fromRole and toRole in AdminAction metadata', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, role: Role.USER });
      const qr = dataSource.createQueryRunner();

      await service.changeUserRole(2, mockAdmin.id, Role.ADMIN);

      expect(qr.manager.create).toHaveBeenCalledWith(
        AdminAction,
        expect.objectContaining({
          metadata: { fromRole: Role.USER, toRole: Role.ADMIN },
        }),
      );
    });

    it('should throw ForbiddenException when admin tries to change own role', async () => {
      await expect(
        service.changeUserRole(mockAdmin.id, mockAdmin.id, Role.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changeUserRole(999, mockAdmin.id, Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when target role equals current role', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, role: Role.USER });

      await expect(
        service.changeUserRole(2, mockAdmin.id, Role.USER),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when changing role of last admin', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        id: 2,
        role: Role.ADMIN,
      });
      userRepo.count.mockResolvedValue(1);

      await expect(
        service.changeUserRole(2, mockAdmin.id, Role.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── 리뷰 관리 위임 ────────────────────────────────────

  describe('리뷰 관리 위임', () => {
    let reviewsService: AdminReviewsService;

    beforeEach(() => {
      reviewsService = (service as any).reviewsService as AdminReviewsService;
    });

    it('moderateReview를 reviewsService에 위임한다', async () => {
      const expected = { id: 10, status: 'visible' };
      jest.spyOn(reviewsService, 'moderateReview').mockResolvedValue(expected as any);

      const result = await service.moderateReview(10, ReviewStatus.VISIBLE, 1, 'good review');

      expect(reviewsService.moderateReview).toHaveBeenCalledWith(10, ReviewStatus.VISIBLE, 1, 'good review');
      expect(result).toBe(expected);
    });

    it('moderateReviewWithManager를 reviewsService에 위임한다', async () => {
      const mockReview = { id: 5 } as Review;
      const mockManager = {} as EntityManager;
      const expected = { id: 5, status: 'hidden' };
      jest.spyOn(reviewsService, 'moderateReviewWithManager').mockResolvedValue(expected as any);

      const result = await service.moderateReviewWithManager(
        mockReview, ReviewStatus.HIDDEN, 1, 'spam', mockManager,
      );

      expect(reviewsService.moderateReviewWithManager).toHaveBeenCalledWith(
        mockReview, ReviewStatus.HIDDEN, 1, 'spam', mockManager,
      );
      expect(result).toBe(expected);
    });

    it('deleteReviewByAdmin를 reviewsService에 위임한다', async () => {
      const expected = { affected: 1 };
      jest.spyOn(reviewsService, 'deleteReviewByAdmin').mockResolvedValue(expected as any);

      const result = await service.deleteReviewByAdmin(10, 1, 'inappropriate');

      expect(reviewsService.deleteReviewByAdmin).toHaveBeenCalledWith(10, 1, 'inappropriate');
      expect(result).toBe(expected);
    });

    it('deleteReviewWithManager를 reviewsService에 위임한다', async () => {
      const mockReview = { id: 7 } as Review;
      const mockManager = {} as EntityManager;
      const expected = { success: true };
      jest.spyOn(reviewsService, 'deleteReviewWithManager').mockResolvedValue(expected as any);

      const result = await service.deleteReviewWithManager(
        mockReview, 1, 'violation', mockManager,
      );

      expect(reviewsService.deleteReviewWithManager).toHaveBeenCalledWith(
        mockReview, 1, 'violation', mockManager,
      );
      expect(result).toBe(expected);
    });
  });

  // ─── findActions ───────────────────────────────────────

  describe('findActions', () => {
    it('should return paginated list of admin action logs', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 1,
              actionType: AdminActionType.BAR_APPROVED,
              targetType: 'BAR',
              targetId: 1,
              reason: null,
              admin: { id: 1, name: 'admin1' },
              createdAt: new Date(),
            },
          ],
          1,
        ]),
      };
      adminActionRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findActions({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });

    it('should filter by actionType', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      adminActionRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findActions({
        page: 1,
        limit: 20,
        actionType: AdminActionType.BAR_APPROVED,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'action.actionType = :actionType',
        {
          actionType: AdminActionType.BAR_APPROVED,
        },
      );
    });

    it('should filter by adminId', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      adminActionRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findActions({ page: 1, limit: 20, adminId: 1 });

      expect(qb.andWhere).toHaveBeenCalledWith('action.adminId = :adminId', {
        adminId: 1,
      });
    });

    it('should filter by targetId', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      adminActionRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findActions({ page: 1, limit: 20, targetId: 5 });

      expect(qb.andWhere).toHaveBeenCalledWith('action.targetId = :targetId', {
        targetId: 5,
      });
    });
  });
});
