'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

export interface AddressSearchResult {
  displayName: string;
  formattedAddress: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface UseAddressSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: AddressSearchResult[];
  isLoading: boolean;
  search: () => Promise<void>;
  select: (result: AddressSearchResult) => void;
  selectedResult: AddressSearchResult | null;
  clear: () => void;
}

/**
 * 주소 검색 상태를 관리하는 훅.
 * Google Places API를 통해 주소 자동완성 기능을 제공한다.
 */
export function useAddressSearch(
  onSelect?: (result: AddressSearchResult) => void,
): UseAddressSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] =
    useState<AddressSearchResult | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const { data } = await api.get<{ results: AddressSearchResult[] }>(
        API_ENDPOINTS.MAPS.ADDRESS_SEARCH,
        {
          params: { query: query.trim(), language: 'en' },
        },
      );
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const select = useCallback(
    (result: AddressSearchResult) => {
      setSelectedResult(result);
      setResults([]);
      setQuery(result.displayName);
      onSelect?.(result);
    },
    [onSelect],
  );

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedResult(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    search,
    select,
    selectedResult,
    clear,
  };
}
