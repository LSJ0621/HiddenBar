'use client';

import {
  useQuery,
  keepPreviousData,
} from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import type { PaginatedApiResponse, BookmarkItem } from '@/types';
import { BOOKMARKS_DEFAULT_LIMIT } from '@/lib/constants';

/** 현재 유저의 북마크 목록을 페이지네이션으로 조회한다 */
export const useBookmarks = ({ page, limit }: { page: number; limit?: number }) => {
  const effectiveLimit = limit ?? BOOKMARKS_DEFAULT_LIMIT;
  return useQuery<PaginatedApiResponse<BookmarkItem>>({
    queryKey: queryKeys.bookmarks.page(page),
    queryFn: async () => {
      const { data } = await api.get<PaginatedApiResponse<BookmarkItem>>(
        API_ENDPOINTS.USERS.ME_BOOKMARKS,
        { params: { page, limit: effectiveLimit } },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
};
