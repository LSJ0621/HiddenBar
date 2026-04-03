'use client';

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import type {
  SearchResponse,
  BookmarkToggleResponse,
  BarSummary,
  BarDetail,
  PaginatedApiResponse,
  BookmarkItem,
} from '@/types';

interface BookmarkMutationInput {
  barId: number;
  action: 'add' | 'remove';
}

interface BookmarkMutationContext {
  previousSearches: [readonly unknown[], unknown][];
  previousDetail?: BarDetail;
  previousBookmarks: [readonly unknown[], unknown][];
  barId: number;
}

/**
 * 북마크 추가/제거 통합 mutation. 검색/상세/북마크목록 모든 화면에서 이 mutation을 사용한다.
 * - onMutate: action 기반 명시적 optimistic update (flip 금지)
 * - onSuccess: 서버 응답으로 3종 캐시 reconciliation (필수)
 * - onError: 3종 캐시 rollback
 */
export const useBookmarkMutation = () => {
  const queryClient = useQueryClient();

  /** 검색 캐시(infinite + flat)에서 특정 barId의 필드를 업데이트한다 */
  const updateSearchCaches = (
    barId: number,
    updater: (bar: BarSummary) => BarSummary,
  ) => {
    const searchQueries = queryClient.getQueriesData<unknown>({
      queryKey: queryKeys.bars.search.all,
    });

    searchQueries.forEach(([key, data]) => {
      if (data == null || typeof data !== 'object') return;
      try {
        const record = data as Record<string, unknown>;
        if ('pages' in record) {
          const infinite = data as InfiniteData<SearchResponse>;
          queryClient.setQueryData(key, {
            ...infinite,
            pages: infinite.pages.map((page) => ({
              ...page,
              items: page.items.map((bar) => bar.id === barId ? updater(bar) : bar),
            })),
          });
        } else if ('items' in record) {
          const response = data as SearchResponse;
          queryClient.setQueryData(key, {
            ...response,
            items: response.items.map((bar) => bar.id === barId ? updater(bar) : bar),
          });
        }
      } catch {
        // 캐시 업데이트 실패해도 mutationFn은 실행되어야 함
      }
    });
  };

  return useMutation<BookmarkToggleResponse, Error, BookmarkMutationInput, BookmarkMutationContext>({
    mutationFn: async ({ barId, action }) => {
      const { data } = action === 'add'
        ? await api.put<BookmarkToggleResponse>(API_ENDPOINTS.BARS.BOOKMARK(barId))
        : await api.delete<BookmarkToggleResponse>(API_ENDPOINTS.BARS.BOOKMARK(barId));
      return data;
    },
    onMutate: async ({ barId, action }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bars.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.bookmarks.all });

      // action 기반 목표 상태 (flip 금지)
      const targetIsBookmarked = action === 'add';
      const delta = action === 'add' ? 1 : -1;

      // 1. 검색 캐시 snapshot + optimistic update
      const previousSearches = queryClient.getQueriesData<unknown>({
        queryKey: queryKeys.bars.search.all,
      }).map(([key, data]) => [key, data] as [readonly unknown[], unknown]);

      updateSearchCaches(barId, (bar) => ({
        ...bar,
        isBookmarked: targetIsBookmarked,
        bookmarkCount: Math.max(0, bar.bookmarkCount + delta),
      }));

      // 2. 상세 캐시 snapshot + optimistic update
      const previousDetail = queryClient.getQueryData<BarDetail>(
        queryKeys.bars.detail(barId),
      );
      if (previousDetail) {
        queryClient.setQueryData<BarDetail>(queryKeys.bars.detail(barId), {
          ...previousDetail,
          isBookmarked: targetIsBookmarked,
          bookmarkCount: Math.max(0, previousDetail.bookmarkCount + delta),
        });
      }

      // 3. 북마크 목록 캐시 snapshot + optimistic update (remove일 때만 항목 제거)
      const previousBookmarks = queryClient.getQueriesData<unknown>({
        queryKey: queryKeys.bookmarks.all,
      }).map(([key, data]) => [key, data] as [readonly unknown[], unknown]);

      if (action === 'remove') {
        queryClient.getQueriesData<PaginatedApiResponse<BookmarkItem>>({
          queryKey: queryKeys.bookmarks.all,
        }).forEach(([key, data]) => {
          if (!data) return;
          queryClient.setQueryData(key, {
            ...data,
            items: data.items.filter((item) => item.id !== barId),
            meta: { ...data.meta, totalItems: data.meta.totalItems - 1 },
          });
        });
      }

      return { previousSearches, previousDetail, previousBookmarks, barId };
    },
    onSuccess: (data, { barId }) => {
      // 서버 응답이 최종 truth — 3종 캐시를 서버 값으로 확정
      updateSearchCaches(barId, (bar) => ({
        ...bar,
        isBookmarked: data.isBookmarked,
        bookmarkCount: data.bookmarkCount,
      }));

      const detail = queryClient.getQueryData<BarDetail>(queryKeys.bars.detail(barId));
      if (detail) {
        queryClient.setQueryData<BarDetail>(queryKeys.bars.detail(barId), {
          ...detail,
          isBookmarked: data.isBookmarked,
          bookmarkCount: data.bookmarkCount,
        });
      }

      // 북마크 목록은 항목 추가/제거가 있으므로 invalidate로 refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks.all });
    },
    onError: (_err, _input, context) => {
      if (!context) return;
      // 3종 캐시 rollback
      context.previousSearches.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context.previousDetail !== undefined) {
        queryClient.setQueryData(
          queryKeys.bars.detail(context.barId),
          context.previousDetail,
        );
      }
      context.previousBookmarks.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
  });
};
