'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocationContext } from '@/providers/location-provider';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface UseUserLocationReturn {
  location: UserLocation | null;
  error: string | null;
  isLoading: boolean;
  isPermissionDenied: boolean;
  requestLocation: () => void;
}

const isGeolocationAvailable =
  typeof window !== 'undefined' && 'geolocation' in navigator;

function fetchGeolocation(
  onSuccess: (pos: GeolocationPosition) => void,
  onError: (err: GeolocationPositionError) => void,
) {
  navigator.geolocation.getCurrentPosition(onSuccess, onError);
}

interface UseUserLocationOptions {
  /** true이면 watchPosition으로 실시간 추적, false(기본값)이면 getCurrentPosition 1회 호출 */
  watch?: boolean;
}

/** Geolocation API wrapper hook. LocationProvider 내부에서는 Context를 사용하고, 외부에서는 standalone 동작 */
export const useUserLocation = (
  options?: UseUserLocationOptions,
): UseUserLocationReturn => {
  const ctx = useLocationContext();
  const watch = options?.watch ?? false;
  const hasCtx = ctx !== null;

  // standalone 상태 — Context가 있어도 항상 선언 (hooks 규칙 준수)
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(
    isGeolocationAvailable ? null : 'Geolocation is not supported',
  );
  const [isLoading, setIsLoading] = useState(isGeolocationAvailable);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    setIsLoading(false);
    setIsPermissionDenied(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setIsPermissionDenied(true);
    } else {
      setError(err.message);
    }
    setIsLoading(false);
  }, []);

  const requestLocation = useCallback(() => {
    if (!isGeolocationAvailable) {
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchGeolocation(handleSuccess, handleError);
  }, [handleSuccess, handleError]);

  useEffect(() => {
    // Context가 있으면 standalone geolocation을 호출하지 않음
    if (hasCtx || !isGeolocationAvailable) {
      return;
    }

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
      );
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }

    fetchGeolocation(handleSuccess, handleError);
  }, [hasCtx, watch, handleSuccess, handleError]);

  // LocationProvider 내부: Context에서 위치 정보 사용
  if (ctx) {
    if (watch) {
      ctx.enableWatch();
    }
    return {
      location: ctx.location,
      error: ctx.error,
      isLoading: ctx.isLoading,
      isPermissionDenied: ctx.isPermissionDenied,
      requestLocation: ctx.requestLocation,
    };
  }

  // LocationProvider 외부: standalone 동작 (하위 호환)
  return { location, error, isLoading, isPermissionDenied, requestLocation };
};
