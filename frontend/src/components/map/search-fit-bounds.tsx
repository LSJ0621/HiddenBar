'use client';

import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { LatLng } from '@/types';

interface SearchFitBoundsProps {
  /** 바 좌표 목록 */
  points: LatLng[];
}

/** 검색 결과 바들의 좌표에 맞게 지도 bounds를 자동 조정 */
export function SearchFitBounds({ points }: SearchFitBoundsProps) {
  const map = useMap();
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (!map || points.length === 0) return;

    // 동일한 포인트 세트면 재조정하지 않음
    const key = points.map((p) => `${p.lat},${p.lng}`).join('|');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(15);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const p of points) {
      bounds.extend(p);
    }
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, points]);

  return null;
}
