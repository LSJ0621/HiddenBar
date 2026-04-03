'use client';

import { useEffect, type RefObject } from 'react';

const SCROLL_POSITION_KEY = 'search-scroll-position';

interface UseScrollRestorationParams {
  /** 스크롤 대상 컨테이너 요소의 ref */
  contentRef: RefObject<HTMLDivElement | null>;
  /** 데이터 로딩 상태 (로드 완료 시 복원 실행) */
  isLoading: boolean;
}

/**
 * 검색 페이지의 스크롤 위치를 sessionStorage에 저장하고 복원하는 훅.
 * - 데스크탑: contentRef 요소의 scrollTop 기준
 * - 모바일: window.scrollY 기준
 */
export function useScrollRestoration({ contentRef, isLoading }: UseScrollRestorationParams) {
  /** 스크롤 위치 저장 (데스크탑: contentRef, 모바일: window) */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const getTarget = () => {
      const el = contentRef.current;
      return el && el.scrollHeight > el.clientHeight ? el : null;
    };
    const handleScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const el = getTarget();
        const y = el ? el.scrollTop : window.scrollY;
        sessionStorage.setItem(SCROLL_POSITION_KEY, String(y));
      }, 100);
    };
    const el = getTarget();
    const target: EventTarget = el ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      target.removeEventListener('scroll', handleScroll);
    };
  }, [contentRef]);

  /** 스크롤 위치 복원 (데이터 로드 완료 후) */
  useEffect(() => {
    if (isLoading) return;
    const saved = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (saved) {
      const y = Number(saved);
      requestAnimationFrame(() => {
        const el = contentRef.current;
        if (el && el.scrollHeight > el.clientHeight) {
          el.scrollTop = y;
        } else {
          window.scrollTo(0, y);
        }
      });
    }
  }, [isLoading, contentRef]);
}
