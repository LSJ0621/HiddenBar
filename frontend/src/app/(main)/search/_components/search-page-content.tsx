'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQueryStates, parseAsFloat, parseAsString, parseAsStringLiteral } from 'nuqs';
import { useOnboarding } from '@/components/onboarding/use-onboarding';
import { type MapMouseEvent } from '@vis.gl/react-google-maps';
import { toast } from 'sonner';
import { useSearchByAddress, useSearchByName } from '@/hooks/queries/use-search';
import { useUserLocation } from '@/hooks/use-user-location';
import { useSearchOnboarding } from '@/hooks/use-search-onboarding';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';
import { LocationProvider } from '@/providers/location-provider';
import { SearchBar } from '@/components/search/search-bar';
import { SearchMapPanel } from '@/app/(main)/search/_components/search-map-panel';
import { SearchResultsPanel } from '@/app/(main)/search/_components/search-results-panel';
import type { BarSummary, LatLng } from '@/types';

const SEARCH_TABS = ['address', 'name', 'both', 'map'] as const;
const SEARCH_PARAMS_KEY = 'search-params';

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
  const { state: onboardingState, notifyEvent, goToStep } = useOnboarding();
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

  /** 선택된 바 (InfoWindow 표시용) */
  const [selectedBar, setSelectedBar] = useState<BarSummary | null>(null);
  /** 지도 클릭 핀 (map 탭 전용) */
  const [mapPin, setMapPin] = useState<LatLng | null>(null);
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
      setSelectedBar(null);
    } else if (hasResults && bars.length === 0) {
      toast.info('No results found', { description: 'Showing previous results on map.' });
    }
  }, [bars, isLoading, hasResults]);

  /** 탭 변경 핸들러 — URL 상태와 동기화 (온보딩 중 탭 전환 차단) */
  const setTabForOnboarding = useCallback(
    (value: string) => {
      setSearchState({ tab: value as typeof tab });
    },
    [setSearchState],
  );

  const { isOnboardingTabStep } = useSearchOnboarding({
    onboardingState,
    tab,
    mapPin,
    setTab: setTabForOnboarding,
    goToStep,
    notifyEvent,
    isLoading,
    hasResults,
    barsLength: bars.length,
  });

  /** 탭 변경 핸들러 — URL 상태와 동기화 (온보딩 중 탭 전환 차단) */
  const handleTabChange = useCallback(
    (value: string) => {
      if (isOnboardingTabStep) return;
      setSearchState({ tab: value as typeof tab });
    },
    [setSearchState, isOnboardingTabStep],
  );

  useScrollRestoration({ contentRef, isLoading });

  /** 위치 권한 미허용 배너 (이름만 검색 시 또는 기본 상태에서) */
  const needsLocation = (hasName && !hasExplicitAddress) || (!hasName && !hasExplicitAddress);
  const showLocationBanner = needsLocation && !location && isPermissionDenied && !locationBannerDismissed;

  /** 더보기 버튼 활성 쿼리 */
  const activeQuery = isNameMode ? nameQuery : addressQuery;

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100dvh-4rem)]">
      <SearchMapPanel
        mapCenter={mapCenter}
        tab={tab}
        mapPin={mapPin}
        displayedBars={displayedBars}
        selectedBar={selectedBar}
        onSelectBar={setSelectedBar}
        onMapClick={(e: MapMouseEvent) => {
          setSelectedBar(null);
          if (tab === 'map') {
            const latLng = e.detail.latLng;
            if (latLng) setMapPin({ lat: latLng.lat, lng: latLng.lng });
          }
        }}
      />

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

        {/* 위치 배너 */}
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

        <SearchResultsPanel
          bars={bars}
          isLoading={isLoading}
          showEmpty={showEmpty}
          query={name ?? addressDisplay ?? undefined}
          hasResults={hasResults}
          isLocationLoading={isLocationLoading}
          isPermissionDenied={isPermissionDenied}
          isDefaultNearby={isDefaultNearby}
          hasNextPage={activeQuery.hasNextPage}
          isFetchingNextPage={activeQuery.isFetchingNextPage}
          onLoadMore={() => activeQuery.fetchNextPage()}
          onResetFilters={handleResetFilters}
        />
      </div>
    </div>
  );
}
