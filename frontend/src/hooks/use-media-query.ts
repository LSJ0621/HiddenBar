import { useSyncExternalStore, useCallback } from 'react';

const emptySubscribe = () => () => {};
const returnTrue = () => true;
const returnFalse = () => false;

/**
 * SSR-safe matchMedia 래퍼 훅
 * @param query - CSS 미디어 쿼리 문자열 (예: '(min-width: 1024px)')
 * @param defaultValue - SSR 시 반환할 기본값 (기본: false)
 * @returns {{ matches: boolean; mounted: boolean }} matches: 미디어 쿼리 일치 여부, mounted: 클라이언트 마운트 완료 여부
 */
export function useMediaQuery(query: string, defaultValue = false) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query],
  );

  const matches = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => defaultValue,
  );

  const mounted = useSyncExternalStore(emptySubscribe, returnTrue, returnFalse);

  return { matches, mounted };
}
