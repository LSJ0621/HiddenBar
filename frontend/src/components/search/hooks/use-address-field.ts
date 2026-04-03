'use client';

import { useState, useCallback, useRef } from 'react';

import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { AddressSearchResult } from '@/hooks/use-address-search';
import type { LatLng } from '@/types';

/** 주소 필드의 상태 타입 */
export type AddressFieldState = 'idle' | 'results' | 'selected';

/** 선택된 주소 정보 */
export interface SelectedAddress {
  display: string;
  lat: number;
  lng: number;
}

/**
 * 주소 검색 필드의 상태와 로직을 관리하는 훅.
 * address 탭과 both 탭에서 공유 사용된다.
 */
export function useAddressField(defaults: {
  display: string;
  lat?: number;
  lng?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fieldState, setFieldState] = useState<AddressFieldState>(
    defaults.display && defaults.lat != null && defaults.lng != null
      ? 'selected'
      : 'idle',
  );
  const [query, setQuery] = useState(
    defaults.display && defaults.lat != null && defaults.lng != null
      ? defaults.display
      : '',
  );
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedAddress | null>(
    defaults.display && defaults.lat != null && defaults.lng != null
      ? { display: defaults.display, lat: defaults.lat!, lng: defaults.lng! }
      : null,
  );
  const [highlight, setHighlight] = useState(-1);
  const [isActive, setIsActive] = useState(false);

  /**
   * 주어진 쿼리 문자열로 주소를 검색한다.
   */
  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get<{ results: AddressSearchResult[] }>(
        API_ENDPOINTS.MAPS.ADDRESS_SEARCH,
        { params: { query: q.trim(), language: 'en' } },
      );
      setResults(data.results);
      setFieldState('results');
      setHighlight(-1);
    } catch {
      setResults([]);
      setFieldState('results');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 검색 결과 항목을 선택하여 필드를 selected 상태로 전환한다.
   */
  const select = useCallback((result: AddressSearchResult) => {
    const addr: SelectedAddress = {
      display: result.displayName,
      lat: result.latitude,
      lng: result.longitude,
    };
    setSelected(addr);
    setQuery(result.displayName);
    setFieldState('selected');
    setResults([]);
    setIsActive(false);
    return addr;
  }, []);

  /**
   * 선택된 주소를 초기화하고 필드를 idle 상태로 되돌린다.
   */
  const clear = useCallback(() => {
    setSelected(null);
    setQuery('');
    setFieldState('idle');
    setResults([]);
    inputRef.current?.focus();
  }, []);

  /**
   * 입력값 변경 시 쿼리를 업데이트하고 결과/상태를 초기화한다.
   */
  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setFieldState('idle');
    setResults([]);
  }, []);

  return {
    inputRef,
    fieldState,
    query,
    results,
    loading,
    selected,
    highlight,
    setHighlight,
    isActive,
    setIsActive,
    search,
    select,
    clear,
    handleChange,
  };
}
