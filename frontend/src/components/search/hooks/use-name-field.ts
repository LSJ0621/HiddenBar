'use client';

import { useState, useCallback, useRef, useMemo } from 'react';

import { useBarNameSuggestions } from '@/hooks/queries/use-search';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

/**
 * 바 이름 검색 필드의 상태와 자동완성 로직을 관리하는 훅.
 * name 탭과 both 탭에서 공유 사용된다.
 */
export function useNameField(defaultName: string) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultName);
  const [debouncedName, setDebouncedName] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const [isActive, setIsActive] = useState(false);

  const updateDebounced = useDebouncedCallback((val: string) => {
    setDebouncedName(val);
  }, 300);

  const { data: suggestions } = useBarNameSuggestions(debouncedName);
  const items = useMemo(() => suggestions?.items ?? [], [suggestions?.items]);

  /**
   * 입력값 변경 시 디바운스된 쿼리를 함께 갱신한다.
   */
  const handleChange = useCallback(
    (val: string) => {
      setValue(val);
      setHighlight(-1);
      updateDebounced(val);
    },
    [updateDebounced],
  );

  return {
    inputRef,
    value,
    setValue,
    items,
    highlight,
    setHighlight,
    isActive,
    setIsActive,
    handleChange,
  };
}
