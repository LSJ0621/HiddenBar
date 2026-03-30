'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

interface UserLocation {
  latitude: number;
  longitude: number;
}

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
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
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
      const id = navigator.geolocation.watchPosition(handleSuccess, handleError);
      watchIdRef.current = id;
      return () => {
        navigator.geolocation.clearWatch(id);
        watchIdRef.current = null;
      };
    }

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
  }, [watching, handleSuccess, handleError]);

  return (
    <LocationContext.Provider
      value={{ location, error, isLoading, isPermissionDenied, requestLocation, enableWatch }}
    >
      {children}
    </LocationContext.Provider>
  );
}
