import type { ReviewStatus } from '@my-project/shared';

/** 리뷰 사진 */
export interface ReviewPhoto {
  id: number;
  url: string;
  sortOrder: number;
}

/** 리뷰 작성자 정보 */
export interface ReviewAuthor {
  id: number;
  name: string;
  profileImageUrl: string | null;
}

/** 개별 리뷰 아이템 */
export interface ReviewItem {
  id: number;
  rating: number;
  content: string;
  visitedAt: string | null;
  status: ReviewStatus;
  author: ReviewAuthor;
  photos: ReviewPhoto[];
  createdAt: string;
  updatedAt: string;
}

/** 별점 분포 */
export interface RatingDistribution {
  rating: number;
  count: number;
}

/** 리뷰 통계 */
export interface ReviewStats {
  averageRating: number;
  totalCount: number;
  distribution: RatingDistribution[];
}

/** 리뷰 목록 응답 (페이지네이션 + 통계 포함) */
export interface ReviewListResponse {
  items: ReviewItem[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  stats: ReviewStats;
}

/** 리뷰 생성 DTO */
export interface CreateReviewDto {
  barId: number;
  rating: number;
  content: string;
  visitedAt?: string;
}

/** 리뷰 수정 DTO */
export interface UpdateReviewDto {
  rating?: number;
  content?: string;
  visitedAt?: string;
}

/** 리뷰 목록 조회 파라미터 */
export interface ReviewListParams {
  page?: number;
  limit?: number;
}

/** 관리자 리뷰 상태 변경 DTO */
export interface ModerateReviewDto {
  status: ReviewStatus;
  reason?: string;
}
