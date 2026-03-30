'use client';

import { APIProvider } from '@vis.gl/react-google-maps';

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

/** Wraps children with Google Maps APIProvider. No-ops when API key is missing. */
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  if (!apiKey) return <>{children}</>;
  return <APIProvider apiKey={apiKey} language="en">{children}</APIProvider>;
}
