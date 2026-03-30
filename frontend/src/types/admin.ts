import type {
  BarStatus,
  Role,
  AuthProvider,
  AdminActionType,
  AdminBarsSortBy,
} from '@my-project/shared';

/** 대시보드 KPI 카드 */
export interface DashboardKpiCards {
  totalBars: number;
  totalBarsChangeRate: number;
  pendingBars: number;
  avgPendingWaitDays: number;
  totalUsers: number;
  totalUsersChangeRate: number;
  totalBookmarks: number;
  totalBookmarksChangeRate: number;
  reportedReviews: number;
}

/** 일별 바 등록/심사 추이 항목 */
export interface DailyBarTrendItem {
  date: string;
  registered: number;
  reviewed: number;
}

/** 바 상태 분포 */
export interface BarStatusDistribution {
  pending: number;
  approved: number;
  rejected: number;
}

/** 일별 카운트 항목 */
export interface DailyCountItem {
  date: string;
  count: number;
}

/** 인기 북마크 바 */
export interface TopBookmarkedBar {
  barId: number;
  barName: string;
  city: string;
  bookmarkCount: number;
}

/** 대기중 바 요약 */
export interface PendingBarSummary {
  id: number;
  name: string;
  ownerName: string;
  photoCount: number;
  createdAt: string;
}

/** 최근 관리자 액션 요약 */
export interface RecentAdminActionSummary {
  id: number;
  actionType: string;
  targetType: string;
  targetId: number;
  adminName: string;
  createdAt: string;
}

/** Dashboard API response */
export interface DashboardData {
  kpiCards: DashboardKpiCards;
  barRegistrationTrend: DailyBarTrendItem[];
  barStatusDistribution: BarStatusDistribution;
  userSignupTrend: DailyCountItem[];
  topBookmarkedBars: TopBookmarkedBar[];
  recentPendingBars: PendingBarSummary[];
  recentAdminActions: RecentAdminActionSummary[];
}

/** Admin bar list item */
export interface AdminBarItem {
  id: number;
  name: string;
  city: string;
  country: string;
  owner: { id: number; name: string; email: string };
  photoCount: number;
  status: BarStatus;
  createdAt: string;
}

/** Admin bar detail */
export interface AdminBarDetail extends AdminBarItem {
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  thumbnail: string | null;
  photos: { id: number; url: string; order: number }[];
  bookmarkCount: number;
  rejectionReason: string | null;
  menuItems: Array<{ id: number; name: string; description: string | null; price: number; currency: string }>;
  operatingHours: Array<{ id: number; dayOfWeek: string; openTime: string; closeTime: string; isClosed: boolean }>;
  admin: {
    actions: Array<{
      actionType: AdminActionType;
      reason: string | null;
      admin: { id: number; name: string };
      createdAt: string;
    }>;
  };
}

/** Admin action (audit log) */
export interface AdminAction {
  id: number;
  actionType: AdminActionType;
  targetType: string;
  targetId: number;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  admin: { id: number; name: string };
  createdAt: string;
}

/** Admin user list item */
export interface AdminUserItem {
  id: number;
  email: string;
  name: string;
  profileImage: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

/** Admin user detail */
export interface AdminUserDetail extends AdminUserItem {
  provider: AuthProvider;
  barCount: number;
  bookmarkCount: number;
  bars: Array<{ id: number; name: string; status: BarStatus; city: string; country: string }>;
  recentActions: Array<{ actionType: AdminActionType; reason: string | null; createdAt: string }>;
}

/** Admin bars query params */
export interface AdminBarsParams {
  status?: BarStatus | null;
  q?: string | null;
  country?: string | null;
  sortBy?: AdminBarsSortBy | null;
  page?: number | null;
  limit?: number | null;
}

/** Admin users query params */
export interface AdminUsersParams {
  q?: string | null;
  role?: Role | null;
  isActive?: boolean | null;
  page?: number | null;
  limit?: number | null;
}

/** Admin actions query params */
export interface AdminActionsParams {
  actionType?: AdminActionType | null;
  adminId?: number | null;
  targetId?: number | null;
  page?: number | null;
  limit?: number | null;
}
