'use client';

import { BarCard, BarCardSkeleton, BarCardCarouselSkeleton } from '@/components/bars/bar-card';
import { useSearchBars } from '@/hooks/queries/use-search';
import { SearchSortBy } from '@/types';
import type { BarSummary } from '@/types';

const FALLBACK_LIMIT = 6;

/**
 * 위치 권한이 거부됐을 때 표시되는 폴백 컴포넌트.
 * 최신 등록 바 목록을 그리드(데스크톱) 및 캐러셀(모바일) 형태로 보여준다.
 */
export function FallbackLatestBars() {
  const { data, isLoading } = useSearchBars({
    sortBy: SearchSortBy.NEWEST,
    limit: FALLBACK_LIMIT,
  });

  const bars: BarSummary[] = data?.items ?? [];

  if (!isLoading && bars.length === 0) return null;

  return (
    <div>
      <h3 className="mb-4 font-display text-xl font-light text-landing-cream">Latest Bars</h3>

      {/* 데스크톱 그리드 */}
      <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: FALLBACK_LIMIT }, (_, i) => (
              <BarCardSkeleton key={i} />
            ))
          : bars.map((bar) => <BarCard key={bar.id} bar={bar} />)}
      </div>

      {/* 모바일 캐러셀 */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide md:hidden">
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => (
              <BarCardCarouselSkeleton key={i} />
            ))
          : bars.map((bar) => (
              <BarCard key={bar.id} bar={bar} variant="carousel" />
            ))}
      </div>
    </div>
  );
}
