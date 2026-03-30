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
