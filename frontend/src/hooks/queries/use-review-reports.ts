'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cleanParams } from '@/lib/clean-params';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import { ADMIN_DEFAULT_LIMIT } from '@/lib/constants';
import type {
  AdminReportListParams,
  CreateReportDto,
  ReportListResponse,
  ReportDetail,
  ReportSubmitResponse,
  ResolveReportDto,
} from '@/types/review-report';

/** 리뷰 신고 제출 */
export const useReportReview = (barId: number) => {
  const queryClient = useQueryClient();

  return useMutation<ReportSubmitResponse, Error, { reviewId: number; dto: CreateReportDto }>({
    mutationFn: async ({ reviewId, dto }) => {
      const { data } = await api.post<ReportSubmitResponse>(
        API_ENDPOINTS.REVIEWS.REPORT(reviewId),
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byBar.all(barId) });
      toast.success('Report submitted successfully');
    },
  });
};

/** 관리자 신고 목록 조회 */
export const useAdminReviewReports = (params: AdminReportListParams) => {
  return useQuery<ReportListResponse>({
    queryKey: queryKeys.admin.reviewReports.list(params),
    queryFn: async () => {
      const { data } = await api.get<ReportListResponse>(
        API_ENDPOINTS.ADMIN.REVIEW_REPORTS.LIST,
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

/** 관리자 신고 상세 조회 */
export const useAdminReviewReportDetail = (reportId: number) => {
  return useQuery<ReportDetail>({
    queryKey: queryKeys.admin.reviewReports.detail(reportId),
    queryFn: async () => {
      const { data } = await api.get<ReportDetail>(
        API_ENDPOINTS.ADMIN.REVIEW_REPORTS.DETAIL(reportId),
      );
      return data;
    },
    enabled: !!reportId,
  });
};

/** 관리자 신고 처리 (resolve) */
export const useResolveReviewReport = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { reportId: number; dto: ResolveReportDto }>({
    mutationFn: async ({ reportId, dto }) => {
      await api.patch(
        API_ENDPOINTS.ADMIN.REVIEW_REPORTS.RESOLVE(reportId),
        dto,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.reviewReports.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.dashboard(),
      });
      toast.success('Report has been resolved');
    },
  });
};
