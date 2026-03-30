import type { ReportReason, ReportStatus, ReportResolution } from '@my-project/shared';

/** 신고 접수 요청 DTO */
export interface CreateReportDto {
  reason: ReportReason;
  detail?: string;
}

/** 신고 접수 응답 */
export interface ReportSubmitResponse {
  reviewId: number;
  status: string;
  reportId: number;
  createdAt: string;
}

/** 신고자 정보 */
export interface ReporterInfo {
  id: number;
  name: string;
  email?: string;
}

/** 관리자 신고 목록 아이템 (백엔드 raw entity shape) */
export interface ReportListItem {
  id: number;
  reviewId: number;
  status: ReportStatus;
  reason: ReportReason;
  detail: string | null;
  reporter: ReporterInfo;
  review: {
    id: number;
    status: string;
  } | null;
  createdAt: string;
}

/** 관리자 신고 목록 응답 */
export interface ReportListResponse {
  items: ReportListItem[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

/** 관리자 신고 상세 응답 (백엔드 raw entity shape) */
export interface ReportDetail {
  id: number;
  status: ReportStatus;
  reason: ReportReason;
  detail: string | null;
  createdAt: string;
  processedAt: string | null;
  resolution: ReportResolution | null;
  resolutionNote: string | null;
  reporter: ReporterInfo;
  review: {
    id: number;
    status: string;
    rating: number;
    content: string;
    visitedAt: string | null;
    user: {
      id: number;
      name: string;
    };
  };
}

/** 관리자 신고 처리 요청 DTO */
export interface ResolveReportDto {
  action: ReportResolution;
  note?: string;
}

/** 관리자 신고 목록 조회 파라미터 */
export interface AdminReportListParams {
  page?: number;
  limit?: number;
  status?: ReportStatus;
}
