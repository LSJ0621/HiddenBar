'use client';

import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface DirectionsFitBoundsProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

/** Automatically adjusts map bounds to fit both origin and destination */
export function DirectionsFitBounds({ origin, destination }: DirectionsFitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
}
