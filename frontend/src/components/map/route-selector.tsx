'use client';

import { useRef } from 'react';
import { type DirectionsRoute } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RouteSelectorProps {
  routes: DirectionsRoute[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/**
 * TRANSIT 모드에서 복수 경로가 있을 때 가로 스크롤 카드로 경로 선택 UI를 제공한다.
 * routes.length <= 1이면 렌더링하지 않는다.
 */
export function RouteSelector({ routes, selectedIndex, onSelect }: RouteSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /** 마우스 휠을 가로 스크롤로 변환 */
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current && e.deltaY !== 0) {
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  if (routes.length <= 1) return null;

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      data-testid="route-selector"
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
    >
      {routes.map((route, index) => {
        const transitLines = extractTransitLines(route);
        const isSelected = index === selectedIndex;

        return (
          <Card
            key={index}
            data-testid={`route-option-${index}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(index);
              }
            }}
            className={cn(
              'min-w-[140px] shrink-0 cursor-pointer py-3 transition-colors',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'hover:border-muted-foreground/30',
            )}
          >
            <CardContent className="space-y-1.5 px-3">
              <div className="text-sm font-semibold">Route {index + 1}</div>
              <div className="text-xs text-muted-foreground">
                {route.duration.text}
              </div>
              <div className="text-xs text-muted-foreground">
                {route.distance.text}
              </div>
              {transitLines.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {transitLines.map((line, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[10px]"
                      style={{
                        backgroundColor: line.color,
                        color: line.textColor,
                      }}
                    >
                      {line.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** steps에서 TRANSIT step의 노선 정보를 추출한다. */
function extractTransitLines(route: DirectionsRoute) {
  return route.steps
    .filter((step) => step.transitDetails)
    .map((step) => ({
      name: step.transitDetails!.lineShortName || step.transitDetails!.lineName,
      color: step.transitDetails!.lineColor,
      textColor: step.transitDetails!.lineTextColor,
    }));
}
