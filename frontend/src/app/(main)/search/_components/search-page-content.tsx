'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQueryStates, parseAsFloat, parseAsString, parseAsStringLiteral } from 'nuqs';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { toast } from 'sonner';
import { useSearchByAddress, useSearchByName } from '@/hooks/queries/use-search';
import { useUserLocation } from '@/hooks/use-user-location';
import { LocationProvider } from '@/providers/location-provider';
import { SearchBar } from '@/components/search/search-bar';
import { SearchEmptyState } from '@/components/search/search-empty-state';
import { BarCard, BarCardHorizontalSkeleton } from '@/components/bars/bar-card';
import { Button } from '@/components/ui/button';
import { MapView } from '@/components/map/map-view';
import { BarMarker } from '@/components/map/bar-marker';
import { UserLocationDot } from '@/components/map/user-location-dot';
import { SearchFitBounds } from '@/components/map/search-fit-bounds';
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

  /** 지도 클릭 핀 (map 탭 전용) */
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number } | null>(null);
  /** 지도에 표시할 바 목록 (검색 결과 0건 시 이전 결과 유지) */
  const [displayedBars, setDisplayedBars] = useState<BarSummary[]>([]);
  /** 결과 패널 ref (데스크탑 독립 스크롤용) */
  const contentRef = useRef<HTMLDivElement>(null);

  /** 지도 중심점 (유저 위치 기반) */
  const mapCenter = location
    ? { lat: location.latitude, lng: location.longitude }
    : undefined;

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

  /** 지도 핀 위치로 검색 실행 (map 탭 전용) */
  const handleMapSearch = useCallback(() => {
    if (!mapPin) return;
    handleSearch({ lat: mapPin.lat, lng: mapPin.lng, addressDisplay: 'Map pin' });
  }, [mapPin, handleSearch]);

  /** 결과 데이터 추출 */
  const hasResults = isNameMode || isAddressOnlyMode || isLocationLoading;

  const namePages = nameQuery.data?.pages;
  const addressPages = addressQuery.data?.pages;

  const bars = useMemo(() => {
    if (isNameMode) return namePages?.flatMap((p) => p.items) ?? [];
    if (isAddressOnlyMode) return addressPages?.flatMap((p) => p.items) ?? [];
    return [];
  }, [isNameMode, isAddressOnlyMode, namePages, addressPages]);

  const isLoading = isNameMode
    ? nameQuery.isLoading
    : isAddressOnlyMode
      ? addressQuery.isLoading
      : isLocationLoading;

  const showEmpty = !isLoading && hasResults && bars.length === 0;

  /** 검색 결과가 있으면 지도 핀 갱신, 0건이면 이전 핀 유지 + toast */
  useEffect(() => {
    if (isLoading) return;
    if (bars.length > 0) {
      setDisplayedBars(bars);
    } else if (hasResults && bars.length === 0) {
      toast.info('No results found', { description: 'Showing previous results on map.' });
    }
  }, [bars, isLoading, hasResults]);

  /** 탭 변경 핸들러 — URL 상태와 동기화 */
  const handleTabChange = useCallback(
    (value: string) => {
      setSearchState({ tab: value as typeof tab });
    },
    [setSearchState],
  );

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
  }, []);

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
    <div className="flex flex-col md:flex-row md:h-[calc(100dvh-4rem)]">
      {/* 지도 패널 */}
      <div className="shrink-0 px-4 pt-4 md:sticky md:top-16 md:h-[calc(100dvh-4rem)] md:w-1/2 md:p-0 lg:w-[55%]">
        <MapView
          center={mapCenter}
          className="h-[200px] overflow-hidden rounded-lg md:h-full md:rounded-none"
          onMapClick={
            tab === 'map'
              ? (e) => {
                  const latLng = e.detail.latLng;
                  if (latLng) setMapPin({ lat: latLng.lat, lng: latLng.lng });
                }
              : undefined
          }
        >
          {mapCenter && <UserLocationDot position={mapCenter} />}
          {tab === 'map' && mapPin && (
            <AdvancedMarker position={mapPin}>
              <svg
                width="22"
                height="28"
                viewBox="0 0 56 72"
                fill="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="search-pin-grad" x1="28" y1="0" x2="28" y2="60" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2C2418" />
                    <stop offset="1" stopColor="#1A1610" />
                  </linearGradient>
                </defs>
                <path
                  d="M28 0C12.536 0 0 12.536 0 28c0 21 28 44 28 44s28-23 28-44C56 12.536 43.464 0 28 0z"
                  fill="url(#search-pin-grad)"
                />
                <path
                  d="M20 17h16l-6 10h-4l-6-10z"
                  fill="none"
                  stroke="#E8A849"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <rect x="27" y="27" width="2" height="5" rx="0.8" fill="#E8A849" />
                <rect x="24" y="32" width="8" height="1.5" rx="0.75" fill="#E8A849" />
                <line x1="21" y1="20" x2="35" y2="20" stroke="#E8A849" strokeWidth="1" opacity="0.4" />
              </svg>
            </AdvancedMarker>
          )}
          {displayedBars.map((bar) => (
            <BarMarker key={bar.id} bar={bar} />
          ))}
          {displayedBars.length > 0 && (
            <SearchFitBounds
              points={displayedBars.map((b) => ({ lat: b.latitude, lng: b.longitude }))}
            />
          )}
        </MapView>
      </div>

      {/* 검색 + 결과 패널 */}
      <div ref={contentRef} className="flex-1 px-4 py-4 md:overflow-y-auto md:px-6 lg:px-8 scrollbar-hide">
        <div className="mb-6">
          <SearchBar
            onSearch={handleSearch}
            defaultName={name ?? ''}
            defaultAddressDisplay={addressDisplay ?? ''}
            defaultAddressLat={addressLat ?? undefined}
            defaultAddressLng={addressLng ?? undefined}
            tab={tab}
            onTabChange={handleTabChange}
            mapPin={mapPin}
            onMapSearch={handleMapSearch}
          />
        </div>
        {locationBanner}

        {/* 결과 */}
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
