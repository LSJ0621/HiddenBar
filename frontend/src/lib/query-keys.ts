import type { SearchParams, AdminBarsParams, AdminUsersParams, AdminActionsParams } from '@/types';
import type { BarStatus } from '@/types';
import type { ReviewListParams } from '@/types/review';
import type { AdminReportListParams } from '@/types/review-report';

/** Centralized React Query key factory */
export const queryKeys = {
  users: {
    all: ['users'] as const,
    me: () => ['users', 'me'] as const,
  },
  bookmarks: {
    all: ['bookmarks'] as const,
    page: (page: number) => ['bookmarks', { page }] as const,
  },
  bars: {
    all: ['bars'] as const,
    search: {
      all: ['bars', 'search'] as const,
      params: (params: Omit<SearchParams, 'offset'>) => ['bars', 'search', params] as const,
    },
    nearby: (lat?: number | null, lng?: number | null, limit?: number) => ['bars', 'nearby', lat, lng, limit] as const,
    detail: (id: number) => ['bars', id] as const,
    my: {
      all: ['bars', 'my'] as const,
      list: (params: { status?: BarStatus | null; page?: number | null; limit?: number | null }) =>
        ['bars', 'my', params] as const,
    },
  },
  maps: {
    all: ['maps'] as const,
    directions: (
      origin: { lat: number; lng: number } | null,
      dest: { lat: number; lng: number } | null,
      mode: string,
    ) => ['maps', 'directions', origin, dest, mode] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    byBar: {
      all: (barId: number) => ['reviews', 'bar', barId] as const,
      list: (barId: number, params: ReviewListParams) => ['reviews', 'bar', barId, params] as const,
    },
    my: (barId: number) => ['reviews', 'my', barId] as const,
  },
  admin: {
    dashboard: () => ['admin', 'dashboard'] as const,
    bars: {
      all: ['admin', 'bars'] as const,
      list: (params: AdminBarsParams) => ['admin', 'bars', params] as const,
      detail: (id: number) => ['admin', 'bars', id] as const,
    },
    users: {
      all: ['admin', 'users'] as const,
      list: (params: AdminUsersParams) => ['admin', 'users', params] as const,
      detail: (id: number) => ['admin', 'users', id] as const,
    },
    reviewReports: {
      all: ['admin', 'reviewReports'] as const,
      list: (params: AdminReportListParams) => ['admin', 'reviewReports', params] as const,
      detail: (id: number) => ['admin', 'reviewReports', id] as const,
    },
    actions: (params: AdminActionsParams) => ['admin', 'actions', params] as const,
  },
} as const;
