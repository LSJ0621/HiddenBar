'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Navigation, RefreshCw, X } from 'lucide-react';
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

/** mode별 sessionStorage 캐시 키 */
const getDirectionsCacheKey = (mode: TravelMode) => `directions-cache-${mode}`;

/** 메타데이터를 포함한 경로 캐시 구조 */
interface DirectionsCache {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode: TravelMode;
  data: DirectionsResponse;
}

/** 모든 mode의 경로 캐시를 삭제한다 */
function clearAllDirectionsCache() {
  Object.values(TravelMode).forEach((m) => {
    sessionStorage.removeItem(getDirectionsCacheKey(m));
  });
}

/** 현재 mode의 sessionStorage 캐시를 로드하고 destination 일치 여부를 검증한다 */
function loadDirectionsCache(
  mode: TravelMode,
  dest: { lat: number; lng: number } | null,
): DirectionsCache | null {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(getDirectionsCacheKey(mode));
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as DirectionsCache;
      if (parsed.destination.lat === dest?.lat && parsed.destination.lng === dest?.lng) {
        return parsed;
      }
    } catch { /* */ }
  }
  return null;
}

/** 경로 탭 메인 클라이언트 컴포넌트 */
export function DirectionsPageContent() {
  const router = useRouter();
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
  const { location } = useUserLocation({ watch: true });

  const destination = useMemo(
    () => (bar ? { lat: bar.latitude, lng: bar.longitude } : null),
    [bar],
  );

  // mode별 sessionStorage 캐시 (mode 변경 시 자동 재로드)
  const [cachedDirections, setCachedDirections] = useState<DirectionsCache | null>(
    () => loadDirectionsCache(mode, destination),
  );
  const [prevMode, setPrevMode] = useState(mode);
  if (mode !== prevMode) {
    setPrevMode(mode);
    setCachedDirections(loadDirectionsCache(mode, destination));
  }

  // 지도 표시용 실시간 위치
  const preciseOrigin = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;

  // 쿼리용 출발지: 캐시가 있으면 캐시의 origin, 없으면 최초 위치에서 1회 세팅
  const [routeOrigin, setRouteOrigin] = useState<{ lat: number; lng: number } | null>(
    () => cachedDirections?.origin ?? null,
  );

  // 캐시 없을 때: 최초 위치 잡히면 routeOrigin 초기화 (1회만)
  useEffect(() => {
    if (location && !routeOrigin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 위치 도착 시 1회 초기화, 이후 routeOrigin이 세팅되면 조건 불일치로 재실행 없음
      setRouteOrigin({ lat: location.latitude, lng: location.longitude });
    }
  }, [location, routeOrigin]);

  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error } = useDirections(routeOrigin, destination, mode, {
    enabled: !cachedDirections,
  });

  /** API 응답이 도착하면 sessionStorage에 메타데이터와 함께 캐싱한다 */
  const routeOriginRef = useRef(routeOrigin);
  useEffect(() => { routeOriginRef.current = routeOrigin; }, [routeOrigin]);
  useEffect(() => {
    if (data && routeOriginRef.current && destination) {
      const cache: DirectionsCache = {
        origin: routeOriginRef.current,
        destination,
        mode,
        data,
      };
      sessionStorage.setItem(getDirectionsCacheKey(mode), JSON.stringify(cache));
      setCachedDirections(cache);
    }
  }, [data, destination, mode]);

  /** 현재 위치로 경로 재탐색 (현재 mode 캐시만 무효화) */
  const handleRefresh = useCallback(() => {
    if (!location) {
      toast.error('Unable to get your location. Please allow location access.');
      return;
    }
    sessionStorage.removeItem(getDirectionsCacheKey(mode));
    setCachedDirections(null);
    const newOrigin = { lat: location.latitude, lng: location.longitude };
    setRouteOrigin(newOrigin);
    queryClient.invalidateQueries({
      queryKey: queryKeys.maps.directions(newOrigin, destination, mode),
    });
  }, [location, queryClient, destination, mode]);

  /** 경로 초기화 — 모든 캐시 삭제 후 검색 페이지로 이동 */
  const handleClearRoute = useCallback(() => {
    clearAllDirectionsCache();
    sessionStorage.removeItem('directions-bar');
    router.push('/search');
  }, [router]);

  /** API 응답 우선, 없으면 sessionStorage 캐시 사용 */
  const effectiveData = data ?? cachedDirections?.data ?? null;

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
      {preciseOrigin && (
        <UserLocationDot
          position={preciseOrigin}
          speed={location?.speed}
          accuracy={location?.accuracy}
        />
      )}

      {routeOrigin && destination && (
        <DirectionsFitBounds origin={routeOrigin} destination={destination} />
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
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Directions to {bar.name}</h3>
        <Button variant="ghost" size="sm" onClick={handleClearRoute}>
          <X className="mr-1 size-3" />
          Clear Route
        </Button>
      </div>
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
        hasOrigin={!!routeOrigin || !!effectiveData}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TravelModeSelector mode={mode} onChange={setMode} />
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isFetching} aria-label="Refresh directions">
                  <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearRoute}>
                <X className="mr-1 size-3" />
                Clear Route
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
              hasOrigin={!!routeOrigin || !!effectiveData}
              mode={mode}
            />
          </div>
        </div>
      )}
    </>
  );
}
