import { TravelMode } from '@/types';
import type { DirectionsResponse, LatLng } from '@/types';

/** 메타데이터를 포함한 경로 캐시 구조 */
export interface DirectionsCache {
  origin: LatLng;
  destination: LatLng;
  mode: TravelMode;
  data: DirectionsResponse;
}

/**
 * TravelMode별 sessionStorage 캐시 키를 반환한다
 */
export function getDirectionsCacheKey(mode: TravelMode): string {
  return `directions-cache-${mode}`;
}

/**
 * 모든 TravelMode의 경로 캐시를 sessionStorage에서 삭제한다
 */
export function clearAllDirectionsCache(): void {
  Object.values(TravelMode).forEach((m) => {
    sessionStorage.removeItem(getDirectionsCacheKey(m));
  });
}

/**
 * 현재 mode의 sessionStorage 캐시를 로드하고 destination 일치 여부를 검증한다.
 * SSR 환경이거나 destination이 일치하지 않으면 null을 반환한다
 */
export function loadDirectionsCache(
  mode: TravelMode,
  dest: LatLng | null,
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

/**
 * 경로 데이터를 메타데이터와 함께 sessionStorage에 저장한다
 */
export function saveDirectionsCache(cache: DirectionsCache): void {
  sessionStorage.setItem(getDirectionsCacheKey(cache.mode), JSON.stringify(cache));
}
