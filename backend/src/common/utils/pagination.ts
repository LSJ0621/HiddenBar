/**
 * 페이지네이션 메타데이터를 생성한다.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
) {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  };
}
