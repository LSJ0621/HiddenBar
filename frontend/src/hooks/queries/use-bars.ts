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
  BarDetail,
  PaginatedApiResponse,
  MyBarItem,
  CreateBarDto,
  UpdateBarDto,
  BarPhoto,
} from '@/types';
import { BarStatus } from '@/types';
import { MY_BARS_DEFAULT_LIMIT } from '@/lib/constants';

/** Fetch bar detail by ID */
export const useBarDetail = (id: number) => {
  return useQuery<BarDetail>({
    queryKey: queryKeys.bars.detail(id),
    queryFn: async () => {
      const { data } = await api.get<BarDetail>(API_ENDPOINTS.BARS.DETAIL(id));
      return data;
    },
    enabled: !!id,
  });
};

/** Fetch my bars with optional status filter and pagination */
export const useMyBars = (params: {
  status?: BarStatus | null;
  page?: number | null;
  limit?: number | null;
} = {}) => {
  return useQuery<PaginatedApiResponse<MyBarItem>>({
    queryKey: queryKeys.bars.my.list(params),
    queryFn: async () => {
      const { data } = await api.get<PaginatedApiResponse<MyBarItem>>(API_ENDPOINTS.BARS.MY, {
        params: cleanParams({
          ...params,
          limit: params.limit ?? MY_BARS_DEFAULT_LIMIT,
        }),
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

/** Create a new bar */
export const useCreateBar = () => {
  const queryClient = useQueryClient();

  return useMutation<BarDetail, Error, CreateBarDto>({
    mutationFn: async (dto) => {
      const cleaned = Object.fromEntries(
        Object.entries(dto).filter(([, v]) => v !== ''),
      );
      const { data } = await api.post<BarDetail>(API_ENDPOINTS.BARS.LIST, cleaned);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bars.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.maps.all });
    },
  });
};

/** Update an existing bar */
export const useUpdateBar = (id: number) => {
  const queryClient = useQueryClient();

  return useMutation<BarDetail, Error, UpdateBarDto>({
    mutationFn: async (dto) => {
      const cleaned = Object.fromEntries(
        Object.entries(dto).filter(([, v]) => v !== ''),
      );
      const { data } = await api.patch<BarDetail>(API_ENDPOINTS.BARS.DETAIL(id), cleaned);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bars.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bars.my.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bars.search.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.maps.all });
    },
  });
};

/** Delete my bar */
export const useDeleteMyBar = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (barId) => {
      await api.delete(API_ENDPOINTS.BARS.DETAIL(barId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bars.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.maps.all });
    },
  });
};

/** Upload photos for a bar */
export const useUploadPhotos = (barId: number) => {
  const queryClient = useQueryClient();

  return useMutation<BarPhoto[], Error, File[]>({
    mutationFn: async (files) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const { data } = await api.post<{ photos: BarPhoto[] }>(API_ENDPOINTS.BARS.PHOTOS(barId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.photos;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bars.detail(barId) });
    },
  });
};

