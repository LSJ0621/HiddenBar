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
import { REVIEWS_DEFAULT_LIMIT } from '@/lib/constants';
import { useAuthStore } from '@/hooks/use-auth';
import type {
  ReviewItem,
  ReviewListResponse,
  ReviewListParams,
  CreateReviewDto,
  UpdateReviewDto,
} from '@/types/review';

/** 바 리뷰 목록 + 통계 조회 */
export const useBarReviews = (barId: number, params: ReviewListParams = {}) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<ReviewListResponse>({
    queryKey: queryKeys.reviews.byBar.list(barId, params),
    queryFn: async () => {
      const { data } = await api.get<ReviewListResponse>(
        API_ENDPOINTS.REVIEWS.BY_BAR(barId),
        {
          params: cleanParams({
            ...params,
            limit: params.limit ?? REVIEWS_DEFAULT_LIMIT,
          }),
        },
      );
      return data;
    },
    enabled: !!barId && isAuthenticated,
    placeholderData: keepPreviousData,
  });
};

/** 내 리뷰 조회 */
export const useMyReview = (barId: number) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery<ReviewItem | null>({
    queryKey: queryKeys.reviews.my(barId),
    queryFn: async () => {
      const { data } = await api.get<ReviewItem | null>(
        API_ENDPOINTS.REVIEWS.MY_REVIEW(barId),
      );
      return data;
    },
    enabled: !!barId && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
};

/** 리뷰 작성 */
export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation<ReviewItem, Error, CreateReviewDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ReviewItem>(API_ENDPOINTS.REVIEWS.CREATE, dto);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byBar.all(variables.barId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.my(variables.barId) });
    },
  });
};

/** 리뷰 수정 */
export const useUpdateReview = (reviewId: number, barId: number) => {
  const queryClient = useQueryClient();

  return useMutation<ReviewItem, Error, UpdateReviewDto>({
    mutationFn: async (dto) => {
      const { data } = await api.patch<ReviewItem>(API_ENDPOINTS.REVIEWS.UPDATE(reviewId), dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byBar.all(barId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.my(barId) });
    },
  });
};

/** 리뷰 삭제 */
export const useDeleteReview = (barId: number) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (reviewId) => {
      await api.delete(API_ENDPOINTS.REVIEWS.DELETE(reviewId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byBar.all(barId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.my(barId) });
    },
  });
};

/** 리뷰 사진 업로드 */
export const useUploadReviewPhotos = (reviewId: number, barId: number) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, File[]>({
    mutationFn: async (files) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      await api.post(API_ENDPOINTS.REVIEWS.PHOTOS(reviewId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byBar.all(barId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.my(barId) });
    },
  });
};

/** 리뷰 사진 삭제 */
export const useDeleteReviewPhoto = (reviewId: number, barId: number) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (photoId) => {
      await api.delete(API_ENDPOINTS.REVIEWS.PHOTO(reviewId, photoId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byBar.all(barId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.my(barId) });
    },
  });
};
