import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Bar } from '../entities/bar.entity.js';
import { User } from '../entities/user.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { BarPhoto } from '../entities/bar-photo.entity.js';
import { MenuItem } from '../entities/menu-item.entity.js';
import { OperatingHours } from '../entities/operating-hours.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { AdminAction } from '../entities/admin-action.entity.js';
import { Review } from '../entities/review.entity.js';
import { ReviewPhoto } from '../entities/review-photo.entity.js';
import { ReviewStatsService } from '../reviews/review-stats.service.js';
import {
  BarStatus,
  Role,
  AdminActionType,
  AdminBarsSortBy,
  AuthProvider,
  ReviewStatus,
} from '@my-project/shared';
import { extractThumbnail } from '../common/utils/photo-utils.js';
import { runInTransaction } from '../common/utils/transaction.js';
import { AdminBarsQueryDto } from './dto/admin-bars-query.dto.js';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto.js';
import { AdminActionsQueryDto } from './dto/admin-actions-query.dto.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Bar)
    private readonly barRepository: Repository<Bar>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
    @InjectRepository(AdminAction)
    private readonly adminActionRepository: Repository<AdminAction>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly reviewStatsService: ReviewStatsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 대시보드 통계를 조회한다.
   */
  async getDashboard() {
    const thisMonday = this.getThisWeekMonday();
    const lastMonday = this.getLastWeekMonday();
    const thirtyDaysAgo = this.getThirtyDaysAgo();

    const [
      totalBars,
      pendingBars,
      approvedBars,
      rejectedBars,
      totalUsers,
      totalBookmarks,
      thisWeekBars,
      lastWeekBars,
      thisWeekUsers,
      lastWeekUsers,
      thisWeekBookmarks,
      lastWeekBookmarks,
      avgPendingWaitResult,
      barRegistrationRaw,
      barReviewRaw,
      userSignupRaw,
      topBookmarkedBarsRaw,
      recentPendingBars,
      recentAdminActions,
      reportedReviews,
    ] = await Promise.all([
      this.barRepository.count(),
      this.barRepository.count({ where: { status: BarStatus.PENDING } }),
      this.barRepository.count({ where: { status: BarStatus.APPROVED } }),
      this.barRepository.count({ where: { status: BarStatus.REJECTED } }),
      this.userRepository.count(),
      this.bookmarkRepository.count(),
      this.barRepository
        .createQueryBuilder('bar')
        .where('bar.createdAt >= :thisMonday', { thisMonday })
        .getCount(),
      this.barRepository
        .createQueryBuilder('bar')
        .where('bar.createdAt >= :lastMonday AND bar.createdAt < :thisMonday', {
          lastMonday,
          thisMonday,
        })
        .getCount(),
      this.userRepository
        .createQueryBuilder('user')
        .where('user.createdAt >= :thisMonday', { thisMonday })
        .getCount(),
      this.userRepository
        .createQueryBuilder('user')
        .where(
          'user.createdAt >= :lastMonday AND user.createdAt < :thisMonday',
          { lastMonday, thisMonday },
        )
        .getCount(),
      this.bookmarkRepository
        .createQueryBuilder('bookmark')
        .where('bookmark.createdAt >= :thisMonday', { thisMonday })
        .getCount(),
      this.bookmarkRepository
        .createQueryBuilder('bookmark')
        .where(
          'bookmark.createdAt >= :lastMonday AND bookmark.createdAt < :thisMonday',
          { lastMonday, thisMonday },
        )
        .getCount(),
      this.barRepository
        .createQueryBuilder('bar')
        .select('AVG(EXTRACT(EPOCH FROM (NOW() - bar.createdAt)) / 86400)', 'avg')
        .where('bar.status = :status', { status: BarStatus.PENDING })
        .getRawOne<{ avg: string | null }>(),
      this.barRepository
        .createQueryBuilder('bar')
        .select('DATE(bar.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('bar.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .groupBy('DATE(bar.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; count: string }>(),
      this.adminActionRepository
        .createQueryBuilder('action')
        .select('DATE(action.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('action.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .andWhere('action.actionType IN (:...types)', {
          types: [AdminActionType.BAR_APPROVED, AdminActionType.BAR_REJECTED],
        })
        .groupBy('DATE(action.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; count: string }>(),
      this.userRepository
        .createQueryBuilder('user')
        .select('DATE(user.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('user.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
        .groupBy('DATE(user.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; count: string }>(),
      this.bookmarkRepository
        .createQueryBuilder('bookmark')
        .select('bookmark.barId', 'barId')
        .addSelect('COUNT(*)', 'bookmarkCount')
        .innerJoin('bookmark.bar', 'bar')
        .addSelect('bar.name', 'barName')
        .addSelect('bar.city', 'city')
        .groupBy('bookmark.barId')
        .addGroupBy('bar.name')
        .addGroupBy('bar.city')
        .orderBy('COUNT(*)', 'DESC')
        .limit(10)
        .getRawMany<{
          barId: number;
          barName: string;
          city: string;
          bookmarkCount: string;
        }>(),
      this.barRepository
        .createQueryBuilder('bar')
        .leftJoin('bar.owner', 'owner')
        .addSelect(['owner.name'])
        .loadRelationCountAndMap('bar.photoCount', 'bar.photos')
        .where('bar.status = :status', { status: BarStatus.PENDING })
        .orderBy('bar.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.adminActionRepository
        .createQueryBuilder('action')
        .leftJoinAndSelect('action.admin', 'admin')
        .orderBy('action.createdAt', 'DESC')
        .take(5)
        .getMany(),
      this.reviewRepository.count({
        where: { status: ReviewStatus.REPORTED },
      }),
    ]);

    const registrationMap = new Map(
      barRegistrationRaw.map((r) => [r.date, Number(r.count)]),
    );
    const reviewMap = new Map(
      barReviewRaw.map((r) => [r.date, Number(r.count)]),
    );
    const barRegistrationTrend = this.fillDateGaps([], thirtyDaysAgo, 30).map(
      (item) => ({
        date: item.date,
        registered: registrationMap.get(item.date) ?? 0,
        reviewed: reviewMap.get(item.date) ?? 0,
      }),
    );

    const userSignupTrend = this.fillDateGaps(
      userSignupRaw.map((r) => ({ date: r.date, count: Number(r.count) })),
      thirtyDaysAgo,
      30,
    );

    const avgPendingWaitDays = avgPendingWaitResult?.avg
      ? Math.round(parseFloat(avgPendingWaitResult.avg) * 10) / 10
      : 0;

    return {
      kpiCards: {
        totalBars,
        totalBarsChangeRate: this.calcChangeRate(thisWeekBars, lastWeekBars),
        pendingBars,
        avgPendingWaitDays,
        totalUsers,
        totalUsersChangeRate: this.calcChangeRate(thisWeekUsers, lastWeekUsers),
        totalBookmarks,
        totalBookmarksChangeRate: this.calcChangeRate(
          thisWeekBookmarks,
          lastWeekBookmarks,
        ),
        reportedReviews,
      },
      barRegistrationTrend,
      barStatusDistribution: {
        pending: pendingBars,
        approved: approvedBars,
        rejected: rejectedBars,
      },
      userSignupTrend,
      topBookmarkedBars: topBookmarkedBarsRaw.map((r) => ({
        barId: Number(r.barId),
        barName: r.barName,
        city: r.city,
        bookmarkCount: Number(r.bookmarkCount),
      })),
      recentPendingBars: recentPendingBars.map((bar: any) => ({
        id: bar.id,
        name: bar.name,
        ownerName: bar.owner?.name ?? '',
        photoCount: bar.photoCount ?? 0,
        createdAt: bar.createdAt,
      })),
      recentAdminActions: recentAdminActions.map((action) => ({
        id: action.id,
        actionType: action.actionType,
        targetType: action.targetType,
        targetId: action.targetId,
        adminName: action.admin?.name ?? '',
        createdAt: action.createdAt,
      })),
    };
  }

  /**
   * 관리자용 가게 목록을 조회한다.
   */
  async findBars(query: AdminBarsQueryDto) {
    const {
      page = 1,
      limit = 20,
      status,
      q,
      country,
      sortBy = AdminBarsSortBy.NEWEST,
    } = query;

    const qb = this.barRepository
      .createQueryBuilder('bar')
      .leftJoin('bar.owner', 'owner')
      .addSelect(['owner.id', 'owner.name', 'owner.email'])
      .loadRelationCountAndMap('bar.photoCount', 'bar.photos');

    if (status) {
      qb.andWhere('bar.status = :status', { status });
    }

    if (q) {
      qb.andWhere('(bar.name ILIKE :q OR bar.address ILIKE :q)', {
        q: `%${q}%`,
      });
    }

    if (country) {
      qb.andWhere('bar.country = :country', { country });
    }

    switch (sortBy) {
      case AdminBarsSortBy.OLDEST:
        qb.orderBy('bar.createdAt', 'ASC');
        break;
      case AdminBarsSortBy.NAME:
        qb.orderBy('bar.name', 'ASC');
        break;
      case AdminBarsSortBy.NEWEST:
      default:
        qb.orderBy('bar.createdAt', 'DESC');
        break;
    }

    qb.skip((page - 1) * limit).take(limit);

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
   * 관리자용 가게 상세를 조회한다. 관리자 액션 이력을 포함한다.
   */
  async findBarById(id: number) {
    const bar = await this.barRepository.findOne({
      where: { id },
      relations: ['owner', 'photos', 'menuItems', 'operatingHours'],
    });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    const bookmarkCount = await this.bookmarkRepository.count({
      where: { barId: id },
    });

    const actions = await this.adminActionRepository.find({
      where: { targetType: 'BAR', targetId: id },
      relations: ['admin'],
      order: { createdAt: 'DESC' },
    });

    const thumbnail = extractThumbnail(bar.photos || []);

    const rejectAction = actions.find(
      (a) => a.actionType === AdminActionType.BAR_REJECTED,
    );
    const rejectionReason = rejectAction?.reason ?? null;

    return {
      id: bar.id,
      name: bar.name,
      description: bar.description,
      address: bar.address,
      city: bar.city,
      country: bar.country,
      latitude: bar.latitude,
      longitude: bar.longitude,
      phone: bar.phone,
      website: bar.website,
      status: bar.status,
      owner: { id: bar.owner.id, name: bar.owner.name, email: bar.owner.email },
      photos: (bar.photos || []).map((p) => ({
        id: p.id,
        url: p.url,
        order: p.order,
      })),
      photoCount: (bar.photos || []).length,
      thumbnail,
      bookmarkCount,
      rejectionReason,
      menuItems: (bar.menuItems || []).map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        price: m.price,
        currency: m.currency,
      })),
      operatingHours: (bar.operatingHours || []).map((h) => ({
        id: h.id,
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      })),
      createdAt: bar.createdAt,
      admin: {
        actions: actions.map((a) => ({
          actionType: a.actionType,
          reason: a.reason,
          admin: { id: a.admin.id, name: a.admin.name },
          createdAt: a.createdAt,
        })),
      },
    };
  }

  /**
   * 가게를 승인한다. 트랜잭션으로 상태 변경 + 감사 로그를 기록한다.
   */
  async approveBar(barId: number, adminId: number, reason?: string) {
    const bar = await this.barRepository.findOne({ where: { id: barId } });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.status !== BarStatus.PENDING) {
      throw new ConflictException(
        bar.status === BarStatus.APPROVED
          ? 'This bar is already approved.'
          : 'This bar cannot be approved in its current status.',
      );
    }

    return runInTransaction(this.dataSource, async (manager) => {
      bar.status = BarStatus.APPROVED;
      await manager.save(bar);

      const action = manager.create(AdminAction, {
        actionType: AdminActionType.BAR_APPROVED,
        targetType: 'BAR',
        targetId: barId,
        adminId,
        reason: reason ?? null,
      });
      await manager.save(action);

      return { id: barId, status: BarStatus.APPROVED };
    });
  }

  /**
   * 가게를 거절한다. 트랜잭션으로 상태 변경 + 감사 로그를 기록한다.
   */
  async rejectBar(barId: number, adminId: number, reason: string) {
    const bar = await this.barRepository.findOne({ where: { id: barId } });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.status === BarStatus.REJECTED) {
      throw new ConflictException('This bar is already rejected.');
    }

    return runInTransaction(this.dataSource, async (manager) => {
      bar.status = BarStatus.REJECTED;
      await manager.save(bar);

      const action = manager.create(AdminAction, {
        actionType: AdminActionType.BAR_REJECTED,
        targetType: 'BAR',
        targetId: barId,
        adminId,
        reason,
      });
      await manager.save(action);

      return { id: barId, status: BarStatus.REJECTED };
    });
  }

  /**
   * 가게를 삭제한다 (soft delete). 트랜잭션으로 삭제 + 감사 로그를 기록한다.
   */
  async deleteBar(barId: number, adminId: number, reason?: string) {
    const bar = await this.barRepository.findOne({
      where: { id: barId },
      withDeleted: true,
    });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.deletedAt) {
      throw new ConflictException('This bar is already deleted.');
    }

    await runInTransaction(this.dataSource, async (manager) => {
      const barEntity = await manager.findOne(Bar, {
        where: { id: barId },
      });
      if (!barEntity) {
        throw new NotFoundException('Bar not found.');
      }
      const now = new Date();
      await manager.update(BarPhoto, { barId }, { deletedAt: now });
      await manager.update(MenuItem, { barId }, { deletedAt: now });
      await manager.update(OperatingHours, { barId }, { deletedAt: now });
      await manager.update(Bookmark, { barId }, { deletedAt: now });
      await manager.softRemove(barEntity);

      const action = manager.create(AdminAction, {
        actionType: AdminActionType.BAR_DELETED,
        targetType: 'BAR',
        targetId: barId,
        adminId,
        reason: reason ?? null,
      });
      await manager.save(action);
    });
  }

  /**
   * 관리자용 유저 목록을 조회한다.
   */
  async findUsers(query: AdminUsersQueryDto) {
    const { page = 1, limit = 20, q, role, isActive } = query;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .loadRelationCountAndMap('user.barCount', 'user.bars')
      .loadRelationCountAndMap('user.bookmarkCount', 'user.bookmarks')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (q) {
      qb.andWhere('(user.email ILIKE :q OR user.name ILIKE :q)', {
        q: `%${q}%`,
      });
    }

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
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
   * 관리자용 유저 상세를 조회한다. 가게 목록과 관리자 액션 이력을 포함한다.
   */
  async findUserById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['bars', 'accounts'],
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const bookmarkCount = await this.bookmarkRepository.count({
      where: { userId: id },
    });

    const recentActions = await this.adminActionRepository.find({
      where: { targetType: 'USER', targetId: id },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const provider = user.accounts?.[0]?.provider ?? AuthProvider.EMAIL;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      provider,
      barCount: (user.bars || []).length,
      bookmarkCount,
      bars: (user.bars || []).map((bar) => ({
        id: bar.id,
        name: bar.name,
        status: bar.status,
        city: bar.city,
        country: bar.country,
      })),
      recentActions: recentActions.map((a) => ({
        actionType: a.actionType,
        reason: a.reason,
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * 유저를 정지한다. 트랜잭션으로 상태 변경 + 토큰 삭제 + 감사 로그를 기록한다.
   */
  async suspendUser(userId: number, adminId: number, reason: string) {
    if (userId === adminId) {
      throw new ForbiddenException('You cannot suspend yourself.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!user.isActive) {
      throw new ConflictException('This user is already suspended.');
    }

    return runInTransaction(this.dataSource, async (manager) => {
      user.isActive = false;
      await manager.save(user);

      await manager.delete(RefreshToken, { userId });

      const action = manager.create(AdminAction, {
        actionType: AdminActionType.USER_SUSPENDED,
        targetType: 'USER',
        targetId: userId,
        adminId,
        reason,
      });
      await manager.save(action);

      return { id: userId, isActive: false };
    });
  }

  /**
   * 유저를 활성화한다. 트랜잭션으로 상태 변경 + 감사 로그를 기록한다.
   */
  async activateUser(userId: number, adminId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.isActive) {
      throw new ConflictException('This user is already active.');
    }

    return runInTransaction(this.dataSource, async (manager) => {
      user.isActive = true;
      await manager.save(user);

      const action = manager.create(AdminAction, {
        actionType: AdminActionType.USER_ACTIVATED,
        targetType: 'USER',
        targetId: userId,
        adminId,
      });
      await manager.save(action);

      return { id: userId, isActive: true };
    });
  }

  /**
   * 유저 역할을 변경한다. 트랜잭션으로 역할 변경 + 감사 로그를 기록한다.
   */
  async changeUserRole(
    userId: number,
    adminId: number,
    role: Role,
    reason?: string,
  ) {
    if (userId === adminId) {
      throw new ForbiddenException('You cannot change your own role.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role === role) {
      throw new ConflictException('User already has this role.');
    }

    if (user.role === Role.ADMIN && role !== Role.ADMIN) {
      const adminCount = await this.userRepository.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Cannot change the role of the last admin.',
        );
      }
    }

    const fromRole = user.role;

    return runInTransaction(this.dataSource, async (manager) => {
      user.role = role;
      await manager.save(user);

      const action = manager.create(AdminAction, {
        actionType: AdminActionType.USER_ROLE_CHANGED,
        targetType: 'USER',
        targetId: userId,
        adminId,
        reason: reason ?? null,
        metadata: { fromRole, toRole: role },
      });
      await manager.save(action);

      return { id: userId, role };
    });
  }

  /**
   * 감사 로그 목록을 조회한다.
   */
  async findActions(query: AdminActionsQueryDto) {
    const { page = 1, limit = 20, actionType, adminId, targetId } = query;

    const qb = this.adminActionRepository
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.admin', 'admin')
      .orderBy('action.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (actionType) {
      qb.andWhere('action.actionType = :actionType', { actionType });
    }

    if (adminId) {
      qb.andWhere('action.adminId = :adminId', { adminId });
    }

    if (targetId) {
      qb.andWhere('action.targetId = :targetId', { targetId });
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

    const action = manager.create(AdminAction, {
      actionType,
      targetType: 'REVIEW',
      targetId: review.id,
      adminId,
      reason: reason ?? null,
      metadata: { previousStatus, newStatus: status, barId: review.barId },
    });
    await manager.save(action);

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

    const action = manager.create(AdminAction, {
      actionType: AdminActionType.REVIEW_DELETED,
      targetType: 'REVIEW',
      targetId: review.id,
      adminId,
      reason: reason ?? null,
      metadata: {
        barId: review.barId,
        userId: review.userId,
        rating: review.rating,
      },
    });
    await manager.save(action);
  }

  /**
   * 전주 대비 증감률을 계산한다.
   */
  private calcChangeRate(thisWeek: number, lastWeek: number): number {
    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }

  /**
   * 이번 주 월요일 00:00:00 UTC 기준 Date를 반환한다.
   */
  private getThisWeekMonday(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * 지난 주 월요일 00:00:00 기준 Date를 반환한다.
   */
  private getLastWeekMonday(): Date {
    const thisMonday = this.getThisWeekMonday();
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    return lastMonday;
  }

  /**
   * 현재 시각에서 30일 전 Date를 반환한다.
   */
  private getThirtyDaysAgo(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * 30일간 날짜를 채워서 빈 날짜는 count=0으로 반환한다.
   */
  private fillDateGaps(
    rawData: { date: string; count: number }[],
    startDate: Date,
    days: number,
  ): { date: string; count: number }[] {
    const map = new Map(rawData.map((r) => [r.date, r.count]));
    const result: { date: string; count: number }[] = [];
    const current = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const dateStr = current.toISOString().split('T')[0];
      result.push({ date: dateStr, count: map.get(dateStr) ?? 0 });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }
}
