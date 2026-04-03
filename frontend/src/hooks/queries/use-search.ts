'use client';

import {
  useQuery,
  useInfiniteQuery,
} from '@tanstack/react-query';
import api from '@/lib/api';
import { cleanParams } from '@/lib/clean-params';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import type {
  SearchParams,
  SearchResponse,
  LegacySearchParams,
  NearbyResponse,
} from '@/types';
import {
  NEARBY_RADIUS_KM,
  NEARBY_LIMIT,
  SEARCH_PAGE_SIZE,
  SEARCH_STALE_TIME,
  SEARCH_GC_TIME,
} from '@/lib/constants';

export { useBookmarkMutation } from '@/hooks/queries/use-bookmark-mutation';

/**
 * 주소 기반 검색 (Mode 1). useInfiniteQuery로 5개씩 로드한다.
 * enabled: lat+lng가 있을 때만 실행.
 */
export const useSearchByAddress = (params: SearchParams) => {
  const { lat, lng, radiusKm } = params;

  return useInfiniteQuery<SearchResponse>({
    queryKey: queryKeys.bars.search.params({ lat, lng, radiusKm }),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<SearchResponse>(API_ENDPOINTS.BARS.SEARCH, {
        params: cleanParams({
          lat,
          lng,
          radiusKm,
          limit: SEARCH_PAGE_SIZE,
          offset: pageParam as number,
        }),
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      const totalItems = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return totalItems;
    },
    enabled: lat != null && lng != null,
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
  });
};

/**
 * 이름/복합 검색 (Mode 2, 3). useInfiniteQuery로 5개씩 로드한다.
 * enabled: name이 있을 때만 실행.
 */
export const useSearchByName = (params: SearchParams) => {
  const { name, lat, lng, userLat, userLng, radiusKm } = params;

  return useInfiniteQuery<SearchResponse>({
    queryKey: queryKeys.bars.search.params({ name, lat, lng, userLat, userLng, radiusKm }),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<SearchResponse>(API_ENDPOINTS.BARS.SEARCH, {
        params: cleanParams({
          name,
          lat,
          lng,
          userLat,
          userLng,
          radiusKm,
          limit: SEARCH_PAGE_SIZE,
          offset: pageParam as number,
        }),
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      const totalItems = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return totalItems;
    },
    enabled: !!name?.trim(),
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
  });
};

/**
 * 바 이름 자동완성 (검색바 드롭다운용).
 * 최대 5개 후보를 반환한다. 2자 이상 입력 시에만 실행.
 */
export const useBarNameSuggestions = (name: string) => {
  return useQuery<SearchResponse>({
    queryKey: queryKeys.bars.search.params({ name, limit: 5 }),
    queryFn: async () => {
      const { data } = await api.get<SearchResponse>(API_ENDPOINTS.BARS.SEARCH, {
        params: cleanParams({ name, limit: 5 }),
      });
      return data;
    },
    enabled: name.trim().length >= 2,
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
  });
};

/** 일반 목록 검색 (홈페이지 인기/최신 바 등). 하위 호환용. */
export const useSearchBars = (params: LegacySearchParams) => {
  return useQuery<SearchResponse>({
    queryKey: queryKeys.bars.search.params(params as SearchParams),
    queryFn: async () => {
      const { data } = await api.get<SearchResponse>(API_ENDPOINTS.BARS.SEARCH, {
        params: cleanParams({
          sortBy: params.sortBy,
          limit: params.limit,
          offset: params.offset,
        }),
      });
      return data;
    },
    staleTime: SEARCH_STALE_TIME,
    gcTime: SEARCH_GC_TIME,
  });
};

/** Fetch nearby bars based on user coordinates. Disabled when coordinates are missing. */
export const useNearbyBars = (
  latitude?: number | null,
  longitude?: number | null,
  limit: number = NEARBY_LIMIT,
) => {
  return useQuery<NearbyResponse>({
    queryKey: queryKeys.bars.nearby(latitude, longitude, limit),
    queryFn: async () => {
      const { data } = await api.get<NearbyResponse>(API_ENDPOINTS.BARS.NEARBY, {
        params: {
          lat: latitude,
          lng: longitude,
          radiusKm: NEARBY_RADIUS_KM,
          limit,
        },
      });
      return data;
    },
    enabled: !!latitude && !!longitude,
  });
};
