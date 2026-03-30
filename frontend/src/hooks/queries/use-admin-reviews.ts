'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import type { ModerateReviewDto } from '@/types/review';

/** 관리자 리뷰 상태 변경 */
export const useModerateReview = (barId: number) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { reviewId: number; dto: ModerateReviewDto }>({
    mutationFn: async ({ reviewId, dto }) => {
      await api.patch(API_ENDPOINTS.ADMIN.REVIEWS.MODERATE(reviewId), dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byBar.all(barId) });
      toast.success('Review status updated');
    },
  });
};

/** 관리자 리뷰 삭제 */
export const useAdminDeleteReview = (barId: number) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (reviewId) => {
      await api.delete(API_ENDPOINTS.ADMIN.REVIEWS.DELETE(reviewId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byBar.all(barId) });
      toast.success('Review deleted');
    },
  });
};
