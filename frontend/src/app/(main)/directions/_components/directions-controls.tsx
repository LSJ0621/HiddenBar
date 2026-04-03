'use client';

import { RefreshCw, X } from 'lucide-react';
import { TravelMode } from '@/types';
import type { DirectionsRoute as DirectionsRouteType } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TravelModeSelector } from '@/components/map/travel-mode-selector';
import { RouteSelector } from '@/components/map/route-selector';

/** DirectionsControls 컴포넌트 props */
interface DirectionsControlsProps {
  /** 현재 이동 수단 모드 */
  mode: TravelMode;
  /** 이동 수단 변경 핸들러 */
  onModeChange: (mode: TravelMode) => void;
  /** 경로 새로고침 핸들러 */
  onRefresh: () => void;
  /** 경로 초기화 핸들러 */
  onClearRoute: () => void;
  /** 경로 목록 (TRANSIT 모드에서만 사용) */
  routes: DirectionsRouteType[];
  /** 선택된 경로 인덱스 */
  selectedRouteIndex: number;
  /** 경로 선택 핸들러 */
  onSelectRoute: (index: number) => void;
  /** 새로고침 진행 중 여부 */
  isFetching: boolean;
  /** 레이아웃 방향 (데스크탑: row, 모바일: row-between) */
  layout?: 'desktop' | 'mobile';
}

/**
 * TravelModeSelector + RouteSelector를 묶은 공유 컨트롤 컴포넌트.
 * 데스크탑(패널 상단)과 모바일(지도 하단) 양쪽에서 재사용된다
 */
export function DirectionsControls({
  mode,
  onModeChange,
  onRefresh,
  onClearRoute,
  routes,
  selectedRouteIndex,
  onSelectRoute,
  isFetching,
  layout = 'desktop',
}: DirectionsControlsProps) {
  const refreshButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onRefresh}
      disabled={isFetching}
      aria-label="Refresh directions"
    >
      <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
    </Button>
  );

  const clearButton = (
    <Button
      data-onboarding-target="clear-route"
      variant="ghost"
      size="sm"
      onClick={onClearRoute}
    >
      <X className="mr-1 size-3" />
      Clear Route
    </Button>
  );

  return (
    <div className="space-y-3">
      {layout === 'desktop' ? (
        <div className="flex items-center gap-2">
          <TravelModeSelector mode={mode} onChange={onModeChange} />
          {refreshButton}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TravelModeSelector mode={mode} onChange={onModeChange} />
            {refreshButton}
          </div>
          {clearButton}
        </div>
      )}
      {mode === TravelMode.TRANSIT && (
        <RouteSelector
          routes={routes}
          selectedIndex={selectedRouteIndex}
          onSelect={onSelectRoute}
        />
      )}
    </div>
  );
}
