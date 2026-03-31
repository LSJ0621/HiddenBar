'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from 'lucide-react';
import { TravelMode } from '@/types';
import type { BarSummary } from '@/types';
import { useDirections } from '@/hooks/queries/use-maps';
import { useUserLocation } from '@/hooks/use-user-location';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MapView } from '@/components/map/map-view';
import { BarMarker } from '@/components/map/bar-marker';
import { UserLocationDot } from '@/components/map/user-location-dot';
import { DirectionsRoute, TransitDirectionsRoute } from '@/components/map/directions-route';
import { DirectionsFitBounds } from '@/components/map/directions-fit-bounds';
import { TravelModeSelector } from '@/components/map/travel-mode-selector';
import { DirectionsInfo } from '@/components/map/directions-info';
import { RouteSelector } from '@/components/map/route-selector';

/** 단일 바 길안내에 필요한 최소 데이터 계약 */
export type DirectionsTargetBar = Pick<
  BarSummary,
  'id' | 'name' | 'address' | 'city' | 'country' | 'latitude' | 'longitude'
>;

interface DirectionsSheetProps {
  bar: DirectionsTargetBar;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 바 상세 비교용 길안내 Sheet + /directions 진입점 */
export function DirectionsSheet({ bar, open, onOpenChange }: DirectionsSheetProps) {
  const router = useRouter();
  const [mode, setMode] = useState<TravelMode>(TravelMode.TRANSIT);
  const [routeSelection, setRouteSelection] = useState<{ key: string; index: number }>({
    key: '',
    index: 0,
  });

  const { location } = useUserLocation();

  const origin = location
    ? { lat: location.latitude, lng: location.longitude }
    : null;

  const destination = { lat: bar.latitude, lng: bar.longitude };

  const { data, isLoading, error } = useDirections(
    open ? origin : null,
    open ? destination : null,
    mode,
  );

  const routes = data?.routes ?? [];
  const routeResetKey = `${mode}-${routes.length}`;
  const selectedRouteIndex = routeSelection.key === routeResetKey ? routeSelection.index : 0;
  const setSelectedRouteIndex = (index: number) =>
    setRouteSelection({ key: routeResetKey, index });
  const route = routes[selectedRouteIndex];

  /** sessionStorage에 바 정보 캐싱 후 /directions로 이동 */
  const handleGetDirections = () => {
    sessionStorage.setItem('directions-bar', JSON.stringify(bar));
    sessionStorage.removeItem('directions-cache');
    router.push('/directions');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80dvh] overflow-y-auto scrollbar-hide" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Directions to {bar.name}</SheetTitle>
        </SheetHeader>

        {/* 지도 */}
        <div className="h-[250px] w-full shrink-0 overflow-hidden rounded-lg">
          <MapView center={destination} zoom={14} className="!min-h-0 h-[250px] w-full">
            <BarMarker bar={bar} />
            {origin && <UserLocationDot position={origin} />}
            {origin && <DirectionsFitBounds origin={origin} destination={destination} />}
            {mode === TravelMode.TRANSIT &&
            route?.steps?.some((s) => s.polylines?.length) ? (
              <TransitDirectionsRoute steps={route.steps} />
            ) : route?.overviewPolyline ? (
              <DirectionsRoute encodedPolyline={route.overviewPolyline} />
            ) : null}
          </MapView>
        </div>

        <div className="space-y-4 px-4">
          {/* 이동 수단 선택 + CTA */}
          <div className="flex items-center justify-between">
            <TravelModeSelector mode={mode} onChange={setMode} />
            <Button size="sm" onClick={handleGetDirections}>
              <Navigation className="mr-2 size-4" />
              Get Directions
            </Button>
          </div>

          {/* 대중교통 경로 선택 */}
          {mode === TravelMode.TRANSIT && (
            <RouteSelector
              routes={routes}
              selectedIndex={selectedRouteIndex}
              onSelect={setSelectedRouteIndex}
            />
          )}

          {/* 길안내 정보 */}
          <DirectionsInfo
            route={route}
            isLoading={isLoading}
            error={error}
            hasOrigin={!!origin}
            mode={mode}
          />

        </div>
      </SheetContent>
    </Sheet>
  );
}
