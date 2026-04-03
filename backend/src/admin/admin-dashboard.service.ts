import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bar } from '../entities/bar.entity.js';
import { User } from '../entities/user.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { AdminAction } from '../entities/admin-action.entity.js';
import { Review } from '../entities/review.entity.js';
import {
  BarStatus,
  AdminActionType,
  ReviewStatus,
} from '@my-project/shared';
import {
  DASHBOARD_RECENT_LIMIT,
  DASHBOARD_TREND_DAYS,
  SECONDS_PER_DAY,
} from './admin.constants.js';

@Injectable()
export class AdminDashboardService {
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
        .select(`AVG(EXTRACT(EPOCH FROM (NOW() - bar.createdAt)) / ${SECONDS_PER_DAY})`, 'avg')
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
        .take(DASHBOARD_RECENT_LIMIT)
        .getMany(),
      this.adminActionRepository
        .createQueryBuilder('action')
        .leftJoinAndSelect('action.admin', 'admin')
        .orderBy('action.createdAt', 'DESC')
        .take(DASHBOARD_RECENT_LIMIT)
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
    const barRegistrationTrend = this.fillDateGaps([], thirtyDaysAgo, DASHBOARD_TREND_DAYS).map(
      (item) => ({
        date: item.date,
        registered: registrationMap.get(item.date) ?? 0,
        reviewed: reviewMap.get(item.date) ?? 0,
      }),
    );

    const userSignupTrend = this.fillDateGaps(
      userSignupRaw.map((r) => ({ date: r.date, count: Number(r.count) })),
      thirtyDaysAgo,
      DASHBOARD_TREND_DAYS,
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
    date.setDate(date.getDate() - DASHBOARD_TREND_DAYS);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * 지정 일수만큼 날짜를 채워서 빈 날짜는 count=0으로 반환한다.
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
