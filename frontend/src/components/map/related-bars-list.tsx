'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { BarCard, BarCardMapListSkeleton } from '@/components/bars/bar-card';
import { useNearbyBars } from '@/hooks/queries/use-search';
import { nearbyBarToSummary } from '@/lib/adapters';
import { NEARBY_SIDEBAR_FETCH, NEARBY_SIDEBAR_STEP } from '@/lib/constants';

interface RelatedBarsListProps {
  latitude: number;
  longitude: number;
  currentBarId?: number;
}

/** 바 상세페이지 사이드바용 주변 바 목록. 카드 형태로 5개씩 추가 로드. */
export function RelatedBarsList({ latitude, longitude, currentBarId }: RelatedBarsListProps) {
  const { data, isLoading } = useNearbyBars(latitude, longitude, NEARBY_SIDEBAR_FETCH);
  const [visibleCount, setVisibleCount] = useState(NEARBY_SIDEBAR_STEP);

  const bars = useMemo(() => {
    const items = data?.items ?? [];
    return currentBarId != null
      ? items.filter((bar) => bar.id !== currentBarId)
      : items;
  }, [data, currentBarId]);

  const visibleBars = bars.slice(0, visibleCount);
  const hasMore = visibleCount < bars.length;

  if (isLoading) {
    return (
      <div data-testid="related-bars-list" className="space-y-3">
        <h3 className="font-display text-lg font-semibold">Nearby Bars</h3>
        {Array.from({ length: NEARBY_SIDEBAR_STEP }).map((_, i) => (
          <BarCardMapListSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="related-bars-list" className="space-y-3">
      <h3 className="font-display text-lg font-semibold">Nearby Bars</h3>

      {visibleBars.length > 0 ? (
        <div className="space-y-1">
          {visibleBars.map((bar) => (
            <BarCard
              key={bar.id}
              variant="map-list"
              bar={nearbyBarToSummary(bar)}
              distanceKm={bar.distanceKm}
              showBookmark={false}
            />
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No bars nearby
        </p>
      )}

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setVisibleCount((prev) => prev + NEARBY_SIDEBAR_STEP)}
        >
          Show more
        </Button>
      )}
    </div>
  );
}
