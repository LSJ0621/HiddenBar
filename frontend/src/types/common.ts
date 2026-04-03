/** 위도/경도 좌표 */
export type LatLng = { lat: number; lng: number };

/**
 * Paginated API response.
 * Matches `@my-project/shared` PaginatedResponse shape.
 */
export interface PaginatedApiResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
