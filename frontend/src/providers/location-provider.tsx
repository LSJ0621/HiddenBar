'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

/** 실시간 추적용 — 캐시 좌표 사용하지 않음 */
const GEO_OPTIONS_WATCH: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

/** 초기 위치 확보용 — 최대 3초 전 캐시 허용 */
const GEO_OPTIONS_ONESHOT: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 3000,
};

interface LocationContextValue {
  location: UserLocation | null;
  error: string | null;
  isLoading: boolean;
  isPermissionDenied: boolean;
  requestLocation: () => void;
  enableWatch: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

/** Provider가 있으면 Context에서 위치 정보를 반환하고, 없으면 null 반환 */
export function useLocationContext(): LocationContextValue | null {
  return useContext(LocationContext);
}

/** Geolocation을 한 번만 호출하고 하위 컴포넌트에서 공유하는 Provider */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
      speed: position.coords.speed ?? null,
      heading: position.coords.heading ?? null,
      timestamp: position.timestamp,
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
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, GEO_OPTIONS_ONESHOT);
  }, [handleSuccess, handleError]);

  const enableWatch = useCallback(() => {
    setWatching(true);
  }, []);

  // one-shot 또는 watch 모드
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setError('Geolocation is not supported');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (watching) {
      const id = navigator.geolocation.watchPosition(handleSuccess, handleError, GEO_OPTIONS_WATCH);
      watchIdRef.current = id;
      return () => {
        navigator.geolocation.clearWatch(id);
        watchIdRef.current = null;
      };
    }

    let stale = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (!stale) handleSuccess(pos); },
      (err) => { if (!stale) handleError(err); },
      GEO_OPTIONS_ONESHOT,
    );
    return () => { stale = true; };
  }, [watching, handleSuccess, handleError]);

  const value = useMemo(
    () => ({ location, error, isLoading, isPermissionDenied, requestLocation, enableWatch }),
    [location, error, isLoading, isPermissionDenied, requestLocation, enableWatch],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}
