'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQueryStates, parseAsFloat, parseAsString, parseAsStringLiteral } from 'nuqs';
import { useSearchByAddress, useSearchByName } from '@/hooks/queries/use-search';
import { useUserLocation } from '@/hooks/use-user-location';
import { LocationProvider } from '@/providers/location-provider';
import { SearchBar } from '@/components/search/search-bar';
import { SearchEmptyState } from '@/components/search/search-empty-state';
import { BarCard, BarCardHorizontalSkeleton } from '@/components/bars/bar-card';
import { Button } from '@/components/ui/button';
import { SKELETON_COUNT } from '@/lib/constants';
import type { BarSummary } from '@/types';

const SEARCH_TABS = ['address', 'name', 'both', 'map'] as const;
const SEARCH_PARAMS_KEY = 'search-params';
const SCROLL_POSITION_KEY = 'search-scroll-position';

/** URL에 검색 파라미터가 없으면 sessionStorage에서 복원 후 Inner를 마운트 */
export function SearchPageContent() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hasParams = url.searchParams.has('name') || url.searchParams.has('addressLat') || url.searchParams.has('addressLng');

    if (!hasParams) {
      const stored = sessionStorage.getItem(SEARCH_PARAMS_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const params = new URLSearchParams();
          if (parsed.name != null) params.set('name', parsed.name);
          if (parsed.addressLat != null) params.set('addressLat', String(parsed.addressLat));
          if (parsed.addressLng != null) params.set('addressLng', String(parsed.addressLng));
          if (parsed.addressDisplay != null) params.set('addressDisplay', parsed.addressDisplay);
          if (parsed.tab != null) params.set('tab', parsed.tab);
          window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
        } catch { /* 무시 */ }
      }
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <LocationProvider>
      <SearchPageContentInner />
    </LocationProvider>
  );
}

function SearchPageContentInner() {
  const [searchState, setSearchState] = useQueryStates({
    name: parseAsString,
    addressLat: parseAsFloat,
    addressLng: parseAsFloat,
    addressDisplay: parseAsString,
    tab: parseAsStringLiteral(SEARCH_TABS).withDefault('address'),
  });

  const { name, addressLat, addressLng, addressDisplay } = searchState;
  const tab = searchState.tab;

  /** 검색 파라미터가 변경될 때마다 sessionStorage에 저장 */
  useEffect(() => {
    const hasParams = name != null || addressLat != null || addressLng != null;
    if (hasParams) {
      sessionStorage.setItem(SEARCH_PARAMS_KEY, JSON.stringify({
        name: name || null,
        addressLat: addressLat ?? null,
        addressLng: addressLng ?? null,
        addressDisplay: addressDisplay || null,
        tab,
      }));
    }
  }, [name, addressLat, addressLng, addressDisplay, tab]);

  const { location, isLoading: isLocationLoading, isPermissionDenied, requestLocation } = useUserLocation();
  const [locationBannerDismissed, setLocationBannerDismissed] = useState(false);

  /** 명시적 주소 검색이 없으면 유저 위치를 기본 좌표로 사용 */
  const hasExplicitAddress = addressLat != null && addressLng != null;
  const effectiveLat = hasExplicitAddress ? addressLat : (location?.latitude ?? null);
  const effectiveLng = hasExplicitAddress ? addressLng : (location?.longitude ?? null);
  const hasEffectiveLocation = effectiveLat != null && effectiveLng != null;

  const hasName = !!name?.trim();
  const isNameMode = hasName;
  const isAddressOnlyMode = hasEffectiveLocation && !hasName;
  /** 유저가 기본 위치 기반으로 보고 있는 상태 (검색 전) */
  const isDefaultNearby = !hasExplicitAddress && !hasName && hasEffectiveLocation;

  /** 주소 모드 검색 (Mode 1: 명시적 주소 또는 유저 위치 기반) */
  const addressQuery = useSearchByAddress({
    lat: isNameMode ? null : effectiveLat,
    lng: isNameMode ? null : effectiveLng,
  });

  /** 이름/복합 모드 검색 (Mode 2 or 3) */
  const nameQuery = useSearchByName({
    name,
    lat: hasExplicitAddress ? addressLat : null,
    lng: hasExplicitAddress ? addressLng : null,
    userLat: location?.latitude,
    userLng: location?.longitude,
  });

  /** 검색 실행 핸들러 — 모든 URL 파라미터를 원자적으로 업데이트 */
  const handleSearch = useCallback(
    (params: { name?: string; lat?: number; lng?: number; addressDisplay?: string }) => {
      const hasAddr = params.lat != null && params.lng != null;
      const hasN = !!params.name?.trim();

      let nextTab: 'address' | 'name' | 'both' | 'map' | undefined;

      if (hasAddr && hasN) {
        nextTab = 'both';
      } else if (hasAddr) {
        if (params.addressDisplay === 'Map pin') {
          nextTab = 'map';
        } else {
          nextTab = 'address';
        }
      } else if (hasN) {
        nextTab = 'name';
      }

      setSearchState({
        name: params.name || null,
        addressLat: params.lat ?? null,
        addressLng: params.lng ?? null,
        addressDisplay: params.addressDisplay || null,
        ...(nextTab != null ? { tab: nextTab } : {}),
      });
    },
    [setSearchState],
  );

  const handleResetFilters = useCallback(() => {
    setSearchState({
      name: null,
      addressLat: null,
      addressLng: null,
      addressDisplay: null,
    });
  }, [setSearchState]);

  /** 결과 데이터 추출 */
  let bars: BarSummary[] = [];
  let isLoading = false;
  let showEmpty = false;
  /** 위치 로딩 중이면 결과가 아직 없더라도 "검색하세요" 메시지 대신 로딩 상태를 표시 */
  const hasResults = isNameMode || isAddressOnlyMode || isLocationLoading;

  if (isNameMode) {
    bars = nameQuery.data?.pages.flatMap((p) => p.items) ?? [];
    isLoading = nameQuery.isLoading;
    showEmpty = !isLoading && bars.length === 0;
  } else if (isAddressOnlyMode) {
    bars = addressQuery.data?.pages.flatMap((p) => p.items) ?? [];
    isLoading = addressQuery.isLoading;
    showEmpty = !isLoading && bars.length === 0;
  } else if (isLocationLoading) {
    isLoading = true;
  }

  /** 탭 변경 핸들러 — URL 상태와 동기화 */
  const handleTabChange = useCallback(
    (value: string) => {
      setSearchState({ tab: value as typeof tab });
    },
    [setSearchState],
  );

  /** 스크롤 위치 저장 (스크롤 시 debounce) */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(SCROLL_POSITION_KEY, String(window.scrollY));
      }, 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  /** 스크롤 위치 복원 (데이터 로드 완료 후) */
  useEffect(() => {
    if (isLoading) return;
    const saved = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (saved) {
      const y = Number(saved);
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [isLoading]);

  /** 위치 권한 미허용 배너 (이름만 검색 시 또는 기본 상태에서) */
  const needsLocation = (hasName && !hasExplicitAddress) || (!hasName && !hasExplicitAddress);
  const showLocationBanner = needsLocation && !location && isPermissionDenied && !locationBannerDismissed;

  const locationBanner = (
    <>
      {isLocationLoading && !hasExplicitAddress && (
        <p className="mb-4 text-sm text-muted-foreground">Detecting your location...</p>
      )}
      {showLocationBanner && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm dark:border-yellow-900 dark:bg-yellow-950">
          <span className="text-yellow-800 dark:text-yellow-200">
            {hasName
              ? 'Location access is required for name-only search. Please allow location access.'
              : 'Allow location access to see nearby bars.'}
          </span>
          <button
            type="button"
            className="ml-auto shrink-0 text-sm font-medium text-yellow-800 underline hover:no-underline dark:text-yellow-200"
            onClick={requestLocation}
          >
            Allow
          </button>
          <button
            type="button"
            className="shrink-0 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
            onClick={() => setLocationBannerDismissed(true)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );

  /** 더보기 버튼 (주소 모드 또는 이름 모드) */
  const activeQuery = isNameMode ? nameQuery : addressQuery;
  const showLoadMore = hasResults && activeQuery.hasNextPage;
  const loadMoreButton = showLoadMore && (
    <div className="mt-6 flex justify-center">
      <Button
        variant="outline"
        onClick={() => activeQuery.fetchNextPage()}
        disabled={activeQuery.isFetchingNextPage}
        data-testid="load-more-button"
      >
        {activeQuery.isFetchingNextPage ? 'Loading...' : 'Load More'}
      </Button>
    </div>
  );

  return (
      <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8">
        {/* SearchBar */}
        <div className="mb-6">
          <SearchBar
            onSearch={handleSearch}
            defaultName={name ?? ''}
            defaultAddressDisplay={addressDisplay ?? ''}
            defaultAddressLat={addressLat ?? undefined}
            defaultAddressLng={addressLng ?? undefined}
            tab={tab}
            onTabChange={handleTabChange}
            hasSearchResults={hasResults && bars.length > 0}
            searchResultBars={bars}
          />
        </div>
        {locationBanner}

        {/* Main content */}
        <div>
          <div className="min-w-0 flex-1">
            {/* Results Header */}
            {hasResults && bars.length > 0 && (
              <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
                {isDefaultNearby ? 'Nearby bars' : `${bars.length} result${bars.length !== 1 ? 's' : ''}`}
              </p>
            )}

            {/* Results */}
            {!hasResults && !isLocationLoading ? (
              <p className="py-12 text-center text-muted-foreground">
                {isPermissionDenied
                  ? 'Allow location access or search by address to find bars.'
                  : 'Search by address, bar name, or both to find bars.'}
              </p>
            ) : showEmpty ? (
              <SearchEmptyState query={name ?? addressDisplay ?? undefined} onResetFilters={handleResetFilters} />
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
                {loadMoreButton}
              </>
            )}
          </div>
        </div>
      </div>
    );
}
