'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { queryKeys } from '@/lib/query-keys';
import type { DirectionsResponse } from '@/types';
import { TravelMode } from '@/types';

/** Fetch directions between two points */
export const useDirections = (
  origin: { lat: number; lng: number } | null,
  dest: { lat: number; lng: number } | null,
  mode: TravelMode = TravelMode.WALKING,
  options?: { enabled?: boolean },
) => {
  return useQuery<DirectionsResponse>({
    queryKey: queryKeys.maps.directions(origin, dest, mode),
    queryFn: async () => {
      const { data } = await api.get<DirectionsResponse>(API_ENDPOINTS.MAPS.DIRECTIONS, {
        params: {
          originLat: origin!.lat,
          originLng: origin!.lng,
          destLat: dest!.lat,
          destLng: dest!.lng,
          mode,
        },
      });
      return data;
    },
    enabled: (options?.enabled ?? true) && !!origin && !!dest,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000, // 60분
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 400)) {
        return false;
      }
      return failureCount < 2;
    },
  });
};
