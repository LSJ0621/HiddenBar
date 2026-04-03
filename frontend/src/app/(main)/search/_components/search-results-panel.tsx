'use client';

import { BarCard, BarCardHorizontalSkeleton } from '@/components/bars/bar-card';
import { SearchEmptyState } from '@/components/search/search-empty-state';
import { Button } from '@/components/ui/button';
import { SKELETON_COUNT } from '@/lib/constants';
import type { BarSummary } from '@/types';

interface SearchResultsPanelProps {
  /** 표시할 바 목록 */
  bars: BarSummary[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 결과 없음 상태 */
  showEmpty: boolean;
  /** 검색어 또는 주소 표시 문자열 (빈 상태 메시지용) */
  query: string | undefined;
  /** 검색 결과가 존재하는 상태인지 여부 (쿼리가 실행 중인지) */
  hasResults: boolean;
  /** 위치 로딩 상태 */
  isLocationLoading: boolean;
  /** 위치 권한 거부 여부 */
  isPermissionDenied: boolean;
  /** 기본 근처 바 표시 상태 (검색 전 유저 위치 기반) */
  isDefaultNearby: boolean;
  /** 다음 페이지 존재 여부 */
  hasNextPage: boolean | undefined;
  /** 다음 페이지 로딩 중 여부 */
  isFetchingNextPage: boolean;
  /** 더보기 버튼 클릭 핸들러 */
  onLoadMore: () => void;
  /** 필터 초기화 핸들러 */
  onResetFilters: () => void;
}

/**
 * 검색 결과 목록 패널 컴포넌트.
 * 로딩 스켈레톤, 빈 상태, BarCard 목록, 더보기 버튼을 렌더링한다.
 */
export function SearchResultsPanel({
  bars,
  isLoading,
  showEmpty,
  query,
  hasResults,
  isLocationLoading,
  isPermissionDenied,
  isDefaultNearby,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onResetFilters,
}: SearchResultsPanelProps) {
  return (
    <div className="min-w-0 flex-1">
      {hasResults && bars.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {isDefaultNearby ? 'Nearby bars' : `${bars.length} result${bars.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {!hasResults && !isLocationLoading ? (
        <p className="py-12 text-center text-muted-foreground">
          {isPermissionDenied
            ? 'Allow location access or search by address to find bars.'
            : 'Search by address, bar name, or both to find bars.'}
        </p>
      ) : showEmpty ? (
        <SearchEmptyState query={query} onResetFilters={onResetFilters} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <BarCardHorizontalSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {bars.map((bar, index) => (
              <BarCard
                key={bar.id}
                bar={bar}
                variant="horizontal"
                distanceKm={bar.distanceKm}
                similarityScore={bar.similarityScore}
                priority={index === 0}
              />
            ))}
          </div>
          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={isFetchingNextPage}
                data-testid="load-more-button"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
