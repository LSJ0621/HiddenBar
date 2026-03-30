'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import api from '@/lib/api';
import { cleanParams } from '@/lib/clean-params';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import type {
  DashboardData,
  AdminBarItem,
  AdminBarDetail,
  AdminUserItem,
  AdminUserDetail,
  AdminAction,
  AdminBarsParams,
  AdminUsersParams,
  AdminActionsParams,
  PaginatedApiResponse,
  Role,
} from '@/types';
import { ADMIN_DEFAULT_LIMIT } from '@/lib/constants';

/** Fetch admin dashboard data */
export const useAdminDashboard = () => {
  return useQuery<DashboardData>({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: async () => {
      const { data } = await api.get<DashboardData>(API_ENDPOINTS.ADMIN.DASHBOARD);
      return data;
    },
    staleTime: 60000,
  });
};

/** Fetch admin bars list with filters and pagination */
export const useAdminBars = (params: AdminBarsParams) => {
  return useQuery<PaginatedApiResponse<AdminBarItem>>({
    queryKey: queryKeys.admin.bars.list(params),
    queryFn: async () => {
      const { data } = await api.get<PaginatedApiResponse<AdminBarItem>>(
        API_ENDPOINTS.ADMIN.BARS.LIST,
        {
          params: cleanParams({
            ...params,
            limit: params.limit ?? ADMIN_DEFAULT_LIMIT,
          }),
        },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
};

/** Fetch admin bar detail */
export const useAdminBarDetail = (id: number) => {
  return useQuery<AdminBarDetail>({
    queryKey: queryKeys.admin.bars.detail(id),
    queryFn: async () => {
      const { data } = await api.get<AdminBarDetail>(API_ENDPOINTS.ADMIN.BARS.DETAIL(id));
      return data;
    },
    enabled: !!id,
  });
};

/** Approve a bar */
export const useApproveBar = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; reason?: string }>({
    mutationFn: async ({ id, reason }) => {
      await api.patch(API_ENDPOINTS.ADMIN.BARS.APPROVE(id), { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.bars.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
};

/** Reject a bar */
export const useRejectBar = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      await api.patch(API_ENDPOINTS.ADMIN.BARS.REJECT(id), { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.bars.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
};

/** Delete a bar (admin) */
export const useAdminDeleteBar = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; reason?: string }>({
    mutationFn: async ({ id, reason }) => {
      await api.delete(API_ENDPOINTS.ADMIN.BARS.DELETE(id), { data: { reason } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.bars.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
};

/** Fetch admin users list with filters and pagination */
export const useAdminUsers = (params: AdminUsersParams) => {
  return useQuery<PaginatedApiResponse<AdminUserItem>>({
    queryKey: queryKeys.admin.users.list(params),
    queryFn: async () => {
      const { data } = await api.get<PaginatedApiResponse<AdminUserItem>>(
        API_ENDPOINTS.ADMIN.USERS.LIST,
        {
          params: cleanParams({
            ...params,
            limit: params.limit ?? ADMIN_DEFAULT_LIMIT,
          }),
        },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
};

/** Fetch admin user detail */
export const useAdminUserDetail = (id: number) => {
  return useQuery<AdminUserDetail>({
    queryKey: queryKeys.admin.users.detail(id),
    queryFn: async () => {
      const { data } = await api.get<AdminUserDetail>(API_ENDPOINTS.ADMIN.USERS.DETAIL(id));
      return data;
    },
    enabled: !!id,
  });
};

/** Suspend a user */
export const useSuspendUser = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      await api.patch(API_ENDPOINTS.ADMIN.USERS.SUSPEND(id), { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
};

/** Activate a user */
export const useActivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number }>({
    mutationFn: async ({ id }) => {
      await api.patch(API_ENDPOINTS.ADMIN.USERS.ACTIVATE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
};

/** Change a user's role */
export const useChangeUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: number; role: Role; reason?: string }>({
    mutationFn: async ({ id, role, reason }) => {
      await api.patch(API_ENDPOINTS.ADMIN.USERS.ROLE(id), { role, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
};

/** Fetch admin actions (audit log) with filters and pagination */
export const useAdminActions = (params: AdminActionsParams) => {
  return useQuery<PaginatedApiResponse<AdminAction>>({
    queryKey: queryKeys.admin.actions(params),
    queryFn: async () => {
      const { data } = await api.get<PaginatedApiResponse<AdminAction>>(
        API_ENDPOINTS.ADMIN.ACTIONS,
        {
          params: cleanParams({
            ...params,
            limit: params.limit ?? ADMIN_DEFAULT_LIMIT,
          }),
        },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
};
