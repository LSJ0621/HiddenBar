'use client';

import { Store, Clock, Users, Bookmark, ShieldAlert } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/queries/use-admin';
import { StatCard } from '@/components/admin/stat-card';
import dynamic from 'next/dynamic';

const BarRegistrationTrendChart = dynamic(
  () => import('@/components/admin/dashboard-charts').then((m) => m.BarRegistrationTrendChart),
  { ssr: false },
);
const BarStatusDonutChart = dynamic(
  () => import('@/components/admin/dashboard-charts').then((m) => m.BarStatusDonutChart),
  { ssr: false },
);
const UserSignupTrendChart = dynamic(
  () => import('@/components/admin/dashboard-charts').then((m) => m.UserSignupTrendChart),
  { ssr: false },
);
const TopBookmarkedBarsChart = dynamic(
  () => import('@/components/admin/dashboard-charts').then((m) => m.TopBookmarkedBarsChart),
  { ssr: false },
);
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { formatRelativeDate } from '@/lib/date-utils';

/** 관리자 대시보드 콘텐츠. KPI, 차트, 최근 활동 리스트를 표시한다. */
export function DashboardContent() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!data) return null;

  const {
    kpiCards,
    barRegistrationTrend,
    barStatusDistribution,
    userSignupTrend,
    topBookmarkedBars,
    recentPendingBars,
    recentAdminActions,
  } = data;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="font-display text-lg font-semibold tracking-tight sm:text-2xl">
        Dashboard
      </h1>

      {/* KPI Cards */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard
          data-testid="dashboard-stat-totalBars"
          title="Total Bars"
          value={kpiCards.totalBars}
          icon={Store}
          changeRate={kpiCards.totalBarsChangeRate}
        />
        <StatCard
          data-testid="dashboard-stat-pendingBars"
          title="Pending Review"
          value={kpiCards.pendingBars}
          icon={Clock}
          secondaryLabel={`avg ${kpiCards.avgPendingWaitDays}d wait`}
        />
        <StatCard
          data-testid="dashboard-stat-reportedReviews"
          title="Reported Reviews"
          value={kpiCards.reportedReviews}
          icon={ShieldAlert}
        />
        <StatCard
          data-testid="dashboard-stat-totalUsers"
          title="Total Users"
          value={kpiCards.totalUsers}
          icon={Users}
          changeRate={kpiCards.totalUsersChangeRate}
        />
        <StatCard
          data-testid="dashboard-stat-totalBookmarks"
          title="Total Bookmarks"
          value={kpiCards.totalBookmarks}
          icon={Bookmark}
          changeRate={kpiCards.totalBookmarksChangeRate}
        />
      </div>

      {/* Charts Row 1: Bar Registration Trend + Status Distribution */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BarRegistrationTrendChart data={barRegistrationTrend} />
        </div>
        <BarStatusDonutChart data={barStatusDistribution} />
      </div>

      {/* Charts Row 2: User Signup Trend + Top Bookmarked Bars */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 grid gap-4 sm:gap-6 lg:grid-cols-2">
        <UserSignupTrendChart data={userSignupTrend} />
        <TopBookmarkedBarsChart data={topBookmarkedBars} />
      </div>

      {/* Lists Row: Recent Pending + Recent Admin Actions */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Pending Bars */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Recent Pending Bars</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {recentPendingBars.length === 0 ? (
              <p className="text-xs text-muted-foreground sm:text-sm">
                No pending bars at the moment.
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {recentPendingBars.map((bar) => (
                  <li key={bar.id} className="border-l-2 border-l-warning/50 pl-2 sm:pl-3">
                    <Link
                      href={`/admin/bars/${bar.id}`}
                      className="flex items-center justify-between rounded-md py-2 transition-colors hover:bg-muted sm:py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium sm:text-sm">
                          {bar.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground sm:text-xs">
                          by {bar.ownerName} &middot; {bar.photoCount} photos
                        </p>
                      </div>
                      <span className="ml-2 shrink-0 text-[10px] text-muted-foreground sm:text-xs">
                        {formatRelativeDate(bar.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Admin Actions */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Recent Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {recentAdminActions.length === 0 ? (
              <p className="text-xs text-muted-foreground sm:text-sm">
                No recent actions.
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {recentAdminActions.map((action) => (
                  <li
                    key={action.id}
                    className="flex items-center justify-between rounded-md py-2 transition-colors hover:bg-muted/50 sm:py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Badge className="text-[10px] sm:text-xs" variant={getActionBadgeVariant(action.actionType)}>
                          {formatActionType(action.actionType)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground sm:text-xs">
                          {action.targetType} #{action.targetId}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
                        by {action.adminName}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 text-[10px] text-muted-foreground sm:text-xs">
                      {formatRelativeDate(action.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// formatRelativeDate는 @/lib/date-utils에서 import

/** 액션 타입을 사람이 읽기 좋은 형태로 변환한다 */
function formatActionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** 액션 타입에 따른 뱃지 variant를 반환한다 */
function getActionBadgeVariant(
  type: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (type.includes('APPROVED') || type.includes('ACTIVATED'))
    return 'default';
  if (type.includes('REJECTED') || type.includes('SUSPENDED'))
    return 'destructive';
  if (type.includes('DELETED')) return 'destructive';
  return 'secondary';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Skeleton className="h-6 w-24 sm:h-8 sm:w-32" />
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl border-l-2 border-l-primary/20 sm:h-28" />
        ))}
      </div>
      {/* Charts row 1 */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Skeleton className="h-56 sm:h-80 lg:col-span-2" />
        <Skeleton className="h-56 sm:h-80" />
      </div>
      {/* Charts row 2 */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 sm:h-80" />
        <Skeleton className="h-56 sm:h-80" />
      </div>
      {/* Lists row */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Skeleton className="h-40 sm:h-60" />
        <Skeleton className="h-40 sm:h-60" />
      </div>
    </div>
  );
}
