'use client';

import { type ReactNode, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { useOnboarding } from './use-onboarding';
import { TOTAL_STEPS, type Placement, type StepDefinition } from './onboarding-steps';

/** tooltip과 target 사이 간격 (px) */
const GAP = 12;

interface OnboardingTooltipProps {
  /** 현재 스텝 정의 */
  step: StepDefinition;
  /** 현재 스텝 인덱스 (0-based) */
  stepIndex: number;
  /** target 요소의 DOMRect */
  targetRect: DOMRect;
}

/** 화살표 방향 (tooltip placement의 반대) */
function getArrowDirection(placement: Placement): 'top' | 'bottom' | 'left' | 'right' {
  const map: Record<Placement, 'top' | 'bottom' | 'left' | 'right'> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };
  return map[placement];
}

/** 화살표 CSS 클래스 */
function getArrowClasses(direction: 'top' | 'bottom' | 'left' | 'right'): string {
  const base = 'absolute size-0 border-transparent border-solid';
  switch (direction) {
    case 'top':
      return cn(base, '-top-2 left-1/2 -translate-x-1/2 border-b-card border-x-8 border-b-8 border-t-0');
    case 'bottom':
      return cn(base, '-bottom-2 left-1/2 -translate-x-1/2 border-t-card border-x-8 border-t-8 border-b-0');
    case 'left':
      return cn(base, '-left-2 top-1/2 -translate-y-1/2 border-r-card border-y-8 border-r-8 border-l-0');
    case 'right':
      return cn(base, '-right-2 top-1/2 -translate-y-1/2 border-l-card border-y-8 border-l-8 border-r-0');
  }
}

/**
 * bold 마커를 React 노드로 파싱 (하드코딩된 스텝 메시지 전용)
 */
function parseMessage(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const strongPattern = /<strong>(.*?)<\/strong>/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = strongPattern.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    parts.push(
      <strong key={m.index} className="font-semibold text-primary">
        {m[1]}
      </strong>,
    );
    lastIndex = m.index + m[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * 온보딩 툴팁 컴포넌트
 * @description target 요소 옆에 위치하며 스텝 메시지와 제어 버튼을 표시
 */
export function OnboardingTooltip({
  step,
  stepIndex,
  targetRect,
}: OnboardingTooltipProps) {
  const { next, endTour } = useOnboarding();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [positionReady, setPositionReady] = useState(false);
  const prevTargetRectRef = useRef(targetRect);
  const [actualPlacement, setActualPlacement] = useState<Placement>(step.placement);
  const { matches: isDesktop } = useMediaQuery('(min-width: 768px)');
  const tooltipId = `onboarding-tooltip-${stepIndex}`;

  const placement = useMemo(() => {
    if (!isDesktop && step.mobilePlacement) return step.mobilePlacement;
    return step.placement;
  }, [isDesktop, step.mobilePlacement, step.placement]);

  const message = useMemo(() => {
    if (!isDesktop && step.mobileMessage) return step.mobileMessage;
    return step.message;
  }, [isDesktop, step.mobileMessage, step.message]);

  /** target 요소에 aria-describedby 동적 추가/제거 */
  useEffect(() => {
    const targetEl = document.querySelector(step.target);
    if (!targetEl) return;

    targetEl.setAttribute('aria-describedby', tooltipId);
    return () => {
      targetEl.removeAttribute('aria-describedby');
    };
  }, [step.target, tooltipId]);

  /** tooltip 위치 계산 (targetRect 변경 시 opacity 리셋 → 계산 후 표시) */
  useEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    // 새 target으로 전환되면 먼저 숨김 → 다음 프레임에서 위치 계산 후 표시
    const isNewTarget = prevTargetRectRef.current !== targetRect;
    prevTargetRectRef.current = targetRect;

    if (isNewTarget) {
      setPositionReady(false);
    }

    // rAF로 1프레임 후 위치 계산 (opacity:0 상태에서 렌더된 크기 기반)
    const raf = requestAnimationFrame(() => {
      const tooltipRect = tooltip.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let resolvedPlacement = placement;
      let top = 0;
      let left = 0;

      const calc = (p: Placement) => {
        switch (p) {
          case 'bottom':
            top = targetRect.bottom + GAP;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
            break;
          case 'top':
            top = targetRect.top - tooltipRect.height - GAP;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
            break;
          case 'left':
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
            left = targetRect.left - tooltipRect.width - GAP;
            break;
          case 'right':
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
            left = targetRect.right + GAP;
            break;
        }
      };

      calc(resolvedPlacement);

      // 뷰포트 밖이면 반대 방향으로 flip (noFlip이면 스킵)
      if (!step.noFlip) {
        const flipMap: Record<Placement, Placement> = {
          top: 'bottom',
          bottom: 'top',
          left: 'right',
          right: 'left',
        };

        if (
          top < 0 ||
          top + tooltipRect.height > vh ||
          left < 0 ||
          left + tooltipRect.width > vw
        ) {
          resolvedPlacement = flipMap[resolvedPlacement];
          calc(resolvedPlacement);
        }
      }

      // 최종 범위 클램핑 (16px 패딩으로 모바일 여유 확보)
      left = Math.max(16, Math.min(left, vw - tooltipRect.width - 16));
      top = Math.max(16, Math.min(top, vh - tooltipRect.height - 16));

      setPosition({ top, left });
      setActualPlacement(resolvedPlacement);
      setPositionReady(true);
    });

    return () => cancelAnimationFrame(raf);
  }, [targetRect, placement, step.noFlip]);

  const arrowDirection = getArrowDirection(actualPlacement);
  const renderedMessage = useMemo(() => parseMessage(message), [message]);

  const tooltipContent = (
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      data-onboarding
      className="pointer-events-auto fixed z-[10000] w-72 max-w-[calc(100vw-32px)] rounded-lg border border-primary/30 bg-card p-4 shadow-lg transition-opacity duration-150"
      style={{
        top: position.top,
        left: position.left,
        opacity: positionReady ? 1 : 0,
      }}
    >
      {/* 화살표 */}
      <div className={getArrowClasses(arrowDirection)} />

      {/* 메시지 */}
      <p className="text-sm text-card-foreground">{renderedMessage}</p>

      {/* 하단: 스텝 카운터 + 버튼 */}
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">
          {stepIndex + 1} / {TOTAL_STEPS}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={endTour}
          >
            End tour
          </Button>
          {step.waitFor === 'next' && (
            <Button
              size="sm"
              className="h-8 px-4 text-sm"
              onClick={next}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}
