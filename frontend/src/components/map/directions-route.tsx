'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { DirectionsStep } from '@/types/bar';

interface DirectionsRouteProps {
  encodedPolyline: string;
}

/**
 * Decode a Google Maps encoded polyline string into an array of LatLng points.
 */
function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/** Renders an encoded polyline as a visible path on the map */
export function DirectionsRoute({ encodedPolyline }: DirectionsRouteProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const path = useMemo(() => decodePolyline(encodedPolyline), [encodedPolyline]);

  useEffect(() => {
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const polyline = new google.maps.Polyline({
      path,
      strokeColor: '#4285F4',
      strokeOpacity: 0.8,
      strokeWeight: 5,
      map,
    });

    polylineRef.current = polyline;

    return () => {
      polyline.setMap(null);
    };
  }, [map, path]);

  return null;
}

interface TransitDirectionsRouteProps {
  steps: DirectionsStep[];
}

/** Dotted line symbol for WALK steps */
const WALK_DASH_SYMBOL: google.maps.Symbol = {
  path: 'M 0,-1 0,1',
  strokeOpacity: 1,
  scale: 3,
};

/**
 * Renders step-level polylines with per-step colors.
 * WALK steps: grey dashed line. TRANSIT steps: lineColor solid line.
 */
export function TransitDirectionsRoute({ steps }: TransitDirectionsRouteProps) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const segments = useMemo(() => {
    const result: Array<{
      path: { lat: number; lng: number }[];
      color: string;
      isWalk: boolean;
    }> = [];

    for (const step of steps) {
      if (!step.polylines?.length) continue;

      const isWalk = step.travelMode === 'WALK';
      const color = isWalk
        ? '#9E9E9E'
        : step.transitDetails?.lineColor ?? '#4285F4';

      for (const encoded of step.polylines) {
        result.push({
          path: decodePolyline(encoded),
          color,
          isWalk,
        });
      }
    }

    return result;
  }, [steps]);

  useEffect(() => {
    if (!map) return;

    // Cleanup previous polylines
    for (const pl of polylinesRef.current) {
      pl.setMap(null);
    }
    polylinesRef.current = [];

    for (const segment of segments) {
      const polyline = segment.isWalk
        ? new google.maps.Polyline({
            path: segment.path,
            strokeOpacity: 0,
            icons: [
              {
                icon: WALK_DASH_SYMBOL,
                offset: '0',
                repeat: '12px',
              },
            ],
            strokeColor: segment.color,
            strokeWeight: 4,
            map,
          })
        : new google.maps.Polyline({
            path: segment.path,
            strokeColor: segment.color,
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map,
          });

      polylinesRef.current.push(polyline);
    }

    return () => {
      for (const pl of polylinesRef.current) {
        pl.setMap(null);
      }
      polylinesRef.current = [];
    };
  }, [map, segments]);

  return null;
}
