'use client';

import { Map, useApiIsLoaded, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { Loader2, MapPinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';

interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  children?: React.ReactNode;
  className?: string;
  onMapClick?: (e: MapMouseEvent) => void;
  onIdle?: () => void;
  onDragEnd?: () => void;
  onZoomChanged?: () => void;
}

/** Google Maps wrapper with graceful degradation and loading state */
export function MapView({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  children,
  className,
  onMapClick,
  onIdle,
  onDragEnd,
  onZoomChanged,
}: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const isLoaded = useApiIsLoaded();
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

  if (!apiKey) {
    return (
      <div
        data-testid="map-fallback"
        className={cn(
          'flex items-center justify-center rounded-lg border bg-muted',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <MapPinOff className="size-8" />
          <p>Unable to display map</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-muted',
          className,
        )}
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div data-testid="map-view" className={cn('overflow-hidden rounded-lg', className)}>
      <Map
        className="size-full min-h-[inherit]"
        defaultCenter={center}
        defaultZoom={zoom}
        mapId={mapId}
        onClick={onMapClick}
        onIdle={onIdle}
        onDragend={onDragEnd}
        onZoomChanged={onZoomChanged}
        gestureHandling="greedy"
        fullscreenControl={false}
        zoomControl={false}
        mapTypeControl={false}
        streetViewControl={false}
      >
        {children}
      </Map>
    </div>
  );
}
