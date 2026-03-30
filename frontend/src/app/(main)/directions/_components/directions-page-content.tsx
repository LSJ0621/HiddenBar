'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Navigation, RefreshCw } from 'lucide-react';
import { TravelMode } from '@/types';
import type { DirectionsResponse } from '@/types';
import { useDirections } from '@/hooks/queries/use-maps';
import { useUserLocation } from '@/hooks/use-user-location';
import { useMediaQuery } from '@/hooks/use-media-query';
import { DEFAULT_MAP_CENTER } from '@/lib/constants';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MapView } from '@/components/map/map-view';
import { BarMarker } from '@/components/map/bar-marker';
import { UserLocationDot } from '@/components/map/user-location-dot';
import { DirectionsRoute, TransitDirectionsRoute } from '@/components/map/directions-route';
import { DirectionsFitBounds } from '@/components/map/directions-fit-bounds';
import { TravelModeSelector } from '@/components/map/travel-mode-selector';
import { DirectionsInfo } from '@/components/map/directions-info';
import { RouteSelector } from '@/components/map/route-selector';

import type { DirectionsTargetBar } from '@/components/map/directions-sheet';

const DIRECTIONS_CACHE_KEY = 'directions-cache';

/** 경로 탭 메인 클라이언트 컴포넌트 */
export function DirectionsPageContent() {
  const [bar] = useState<DirectionsTargetBar | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem('directions-bar');
    if (stored) {
      try { return JSON.parse(stored) as DirectionsTargetBar; } catch { /* */ }
    }
    return null;
  });

  const [mode, setMode] = useState<TravelMode>(TravelMode.TRANSIT);
  const [routeSelection, setRouteSelection] = useState<{ key: string; index: number }>({
    key: '',
    index: 0,
  });

  // SSR 레이아웃 플래시 방지
  const { matches: isDesktop, mounted } = useMediaQuery('(min-width: 1024px)');
  const { location } = useUserLocation();

  const origin = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;

  const destination = bar
    ? { lat: bar.latitude, lng: bar.longitude }
    : null;

  /** sessionStorage에서 캐싱된 경로 데이터 복원 */
  const [cachedDirections, setCachedDirections] = useState<DirectionsResponse | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(DIRECTIONS_CACHE_KEY);
    if (stored) {
      try { return JSON.parse(stored) as DirectionsResponse; } catch { /* */ }
    }
    return null;
  });

  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error } = useDirections(origin, destination, mode, {
    enabled: !cachedDirections,
  });

  /** API 응답이 도착하면 sessionStorage에 캐싱 */
  useEffect(() => {
    if (data) {
      sessionStorage.setItem(DIRECTIONS_CACHE_KEY, JSON.stringify(data));
    }
  }, [data]);

  /** 경로 캐시 무효화 후 재요청 */
  const handleRefresh = useCallback(() => {
    sessionStorage.removeItem(DIRECTIONS_CACHE_KEY);
    setCachedDirections(null);
    queryClient.invalidateQueries({
      queryKey: queryKeys.maps.directions(origin, destination, mode),
    });
  }, [queryClient, origin, destination, mode]);

  /** API 응답 우선, 없으면 sessionStorage 캐시 사용 */
  const effectiveData = data ?? cachedDirections;

  const routes = effectiveData?.routes ?? [];
  const routeResetKey = `${mode}-${routes.length}`;
  const selectedRouteIndex = routeSelection.key === routeResetKey ? routeSelection.index : 0;
  const setSelectedRouteIndex = (index: number) =>
    setRouteSelection({ key: routeResetKey, index });
  const route = routes[selectedRouteIndex];

  // 빈 상태: 캐시 없이 직접 진입
  if (!bar) {
    return (
      <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Navigation className="size-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">No directions available</h2>
        <p className="text-sm text-muted-foreground">
          Visit a bar&apos;s detail page and tap &quot;Get Directions&quot; to see directions here.
        </p>
        <Button asChild>
          <Link href="/search">Go to Search</Link>
        </Button>
      </div>
    );
  }

  const mapCenter = destination ?? DEFAULT_MAP_CENTER;

  /** 지도 공통 children */
  const mapChildren = (
    <>
      <BarMarker bar={bar} />
      {origin && <UserLocationDot position={origin} />}

      {origin && destination && (
        <DirectionsFitBounds origin={origin} destination={destination} />
      )}

      {mode === TravelMode.TRANSIT &&
      route?.steps?.some((s) => s.polylines?.length) ? (
        <TransitDirectionsRoute steps={route.steps} />
      ) : route?.overviewPolyline ? (
        <DirectionsRoute encodedPolyline={route.overviewPolyline} />
      ) : null}
    </>
  );

  /** 길안내 정보 패널 */
  const directionsPanel = (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold">Directions to {bar.name}</h3>
      <div className="flex items-center gap-2">
        <TravelModeSelector mode={mode} onChange={setMode} />
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isFetching} aria-label="Refresh directions">
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
        </Button>
      </div>
      {mode === TravelMode.TRANSIT && (
        <RouteSelector
          routes={routes}
          selectedIndex={selectedRouteIndex}
          onSelect={setSelectedRouteIndex}
        />
      )}
      <DirectionsInfo
        route={route}
        isLoading={isLoading && !effectiveData}
        error={effectiveData ? null : error}
        hasOrigin={!!origin || !!effectiveData}
        mode={mode}
      />
    </div>
  );

  // SSR/hydration: CSS 분기로 양쪽 모두 렌더 → hydration 후 JS 분기
  const showMobile = !mounted || !isDesktop;
  const showDesktop = !mounted || isDesktop;

  return (
    <>
      {/* 데스크탑: 2열 레이아웃 (좌 지도 + 우 패널) */}
      {showDesktop && (
        <div className={`flex h-[calc(100vh-12rem)] gap-0${!mounted ? ' hidden lg:flex' : ''}`}>
          <div className="flex-1">
            <MapView center={mapCenter} zoom={14} className="h-full w-full">
              {mapChildren}
            </MapView>
          </div>
          <div className="w-[380px] overflow-y-auto scrollbar-hide border-l">
            {directionsPanel}
          </div>
        </div>
      )}

      {/* 모바일: 상단 지도 + 하단 스크롤 영역 */}
      {showMobile && (
        <div className={!mounted ? 'lg:hidden' : ''}>
          <div className="h-[30dvh] overflow-hidden">
            <MapView center={mapCenter} zoom={14} className="!min-h-0 h-full w-full">
              {mapChildren}
            </MapView>
          </div>
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <TravelModeSelector mode={mode} onChange={setMode} />
              <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isFetching} aria-label="Refresh directions">
                <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
              </Button>
            </div>
            {mode === TravelMode.TRANSIT && (
              <RouteSelector
                routes={routes}
                selectedIndex={selectedRouteIndex}
                onSelect={setSelectedRouteIndex}
              />
            )}
            <DirectionsInfo
              route={route}
              isLoading={isLoading && !effectiveData}
              error={effectiveData ? null : error}
              hasOrigin={!!origin || !!effectiveData}
              mode={mode}
            />
          </div>
        </div>
      )}
    </>
  );
}
