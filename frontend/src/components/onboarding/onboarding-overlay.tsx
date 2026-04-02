'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

/** spotlight 패딩 (px) */
const CUTOUT_PADDING = 8;
/** target 탐색 최대 대기 시간 (ms) — Sheet 열림 애니메이션(500ms) 고려 */
const MAX_POLL_TIME = 3000;

/** rect가 viewport 내에 있는지 확인 (scrollIntoView 완료 대기용) */
function isRectInViewport(rect: DOMRect): boolean {
  return (
    rect.top >= -50 &&
    rect.left >= -50 &&
    rect.bottom <= window.innerHeight + 50 &&
    rect.right <= window.innerWidth + 50
  );
}

/** useTargetTracker 옵션 */
interface UseTargetTrackerOptions {
  /** target에 highlight 클래스를 추가/제거할지 여부 */
  addHighlight?: boolean;
  /** 내부 state로 rect를 관리할지 여부 (Overlay는 로컬 rect state 필요) */
  trackLocalRect?: boolean;
}

/**
 * target 요소를 추적하고 rect를 보고하는 공통 훅
 * @description polling으로 target을 탐색, ResizeObserver로 크기 변경 감지,
 * resize/scroll 시 rect 재계산. highlight 클래스 관리와 로컬 rect state는 옵션.
 */
function useTargetTracker(
  target: string,
  onRectChange: (rect: DOMRect | null) => void,
  options: UseTargetTrackerOptions = {},
) {
  const { addHighlight = false, trackLocalRect = false } = options;
  const targetElRef = useRef<Element | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number>(0);
  const [localRect, setLocalRect] = useState<DOMRect | null>(null);

  /** target rect 업데이트 (viewport 내에 있을 때만) */
  const updateRect = useCallback(() => {
    const el = targetElRef.current;
    if (!el) return;

    const newRect = el.getBoundingClientRect();
    if (isRectInViewport(newRect)) {
      if (trackLocalRect) setLocalRect(newRect);
      onRectChange(newRect);
    }
  }, [onRectChange, trackLocalRect]);

  /** target 탐색 및 (선택적) highlight 클래스 관리 */
  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();

    // 이전 target의 highlight 클래스 제거
    if (addHighlight && targetElRef.current) {
      targetElRef.current.classList.remove('onboarding-highlight');
    }

    const poll = () => {
      if (cancelled) return;

      const el = document.querySelector(target);
      if (el) {
        const elRect = el.getBoundingClientRect();
        if (!isRectInViewport(elRect)) {
          if (Date.now() - startTime < MAX_POLL_TIME) {
            rafRef.current = requestAnimationFrame(poll);
          } else {
            if (trackLocalRect) setLocalRect(null);
            onRectChange(null);
          }
          return;
        }

        targetElRef.current = el;
        if (addHighlight) el.classList.add('onboarding-highlight');
        if (trackLocalRect) setLocalRect(elRect);
        onRectChange(elRect);

        observerRef.current?.disconnect();
        const observer = new ResizeObserver(updateRect);
        observer.observe(el);
        observerRef.current = observer;
        return;
      }

      if (Date.now() - startTime < MAX_POLL_TIME) {
        rafRef.current = requestAnimationFrame(poll);
      } else {
        if (trackLocalRect) setLocalRect(null);
        onRectChange(null);
      }
    };

    rafRef.current = requestAnimationFrame(poll);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (addHighlight && targetElRef.current) {
        targetElRef.current.classList.remove('onboarding-highlight');
      }
      observerRef.current?.disconnect();
    };
  }, [target, updateRect, onRectChange, addHighlight, trackLocalRect]);

  /** window resize/scroll 시 rect 재계산 */
  useEffect(() => {
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect]);

  return localRect;
}

interface OnboardingOverlayProps {
  /** 하이라이트 대상 CSS 선택자 */
  target: string;
  /** target의 DOMRect이 변경될 때 호출 */
  onRectChange: (rect: DOMRect | null) => void;
}

/**
 * 4-panel 오버레이 + Portal 렌더링
 * @description target 영역 주변을 4개 패널(top/right/bottom/left)로 어둡게 처리.
 * target gap은 클릭 통과, 패널 영역은 클릭 차단.
 * body 직속 Portal로 렌더링하여 Sheet 등 Radix Portal과 동일 stacking context 보장.
 */
export function OnboardingOverlay({ target, onRectChange }: OnboardingOverlayProps) {
  const rect = useTargetTracker(target, onRectChange, {
    addHighlight: true,
    trackLocalRect: true,
  });

  // target을 못 찾는 동안에는 아무것도 렌더하지 않음
  if (!rect) return null;

  // 4-panel 좌표 계산
  const cutTop = rect.top - CUTOUT_PADDING;
  const cutLeft = rect.left - CUTOUT_PADDING;
  const cutWidth = rect.width + CUTOUT_PADDING * 2;
  const cutHeight = rect.height + CUTOUT_PADDING * 2;
  const cutBottom = cutTop + cutHeight;
  const cutRight = cutLeft + cutWidth;

  const overlayContent = (
    <div data-onboarding aria-hidden="true">
      {/* Top panel */}
      <div
        className="pointer-events-auto fixed left-0 top-0 z-[9998] bg-black/60"
        style={{ width: '100vw', height: Math.max(0, cutTop) }}
        onClick={(e) => e.stopPropagation()}
      />
      {/* Bottom panel */}
      <div
        className="pointer-events-auto fixed left-0 z-[9998] bg-black/60"
        style={{
          top: cutBottom,
          width: '100vw',
          height: `calc(100vh - ${cutBottom}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {/* Left panel */}
      <div
        className="pointer-events-auto fixed left-0 z-[9998] bg-black/60"
        style={{
          top: cutTop,
          width: Math.max(0, cutLeft),
          height: cutHeight,
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {/* Right panel */}
      <div
        className="pointer-events-auto fixed z-[9998] bg-black/60"
        style={{
          top: cutTop,
          left: cutRight,
          width: `calc(100vw - ${cutRight}px)`,
          height: cutHeight,
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );

  return createPortal(overlayContent, document.body);
}

interface OnboardingTargetTrackerProps {
  /** 추적 대상 CSS 선택자 */
  target: string;
  /** target의 DOMRect이 변경될 때 호출 */
  onRectChange: (rect: DOMRect | null) => void;
}

/**
 * 오버레이 없이 target rect만 추적
 * @description skipOverlay 스텝(Sheet 내부 등)에서 tooltip 위치 계산용 rect만 제공
 */
export function OnboardingTargetTracker({ target, onRectChange }: OnboardingTargetTrackerProps) {
  useTargetTracker(target, onRectChange);
  return null;
}
