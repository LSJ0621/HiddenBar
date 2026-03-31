import { Suspense } from 'react';
import { GoogleMapsProvider } from '@/components/map/google-maps-provider';
import { LocationProvider } from '@/providers/location-provider';
import { DirectionsPageContent } from './_components/directions-page-content';

export const metadata = {
  title: 'Directions — Hidden Bar',
};

export default function DirectionsPage() {
  return (
    <LocationProvider>
      <GoogleMapsProvider>
        <Suspense
        fallback={
          <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4">
            <p className="text-muted-foreground">Loading directions...</p>
          </div>
        }
      >
          <DirectionsPageContent />
        </Suspense>
      </GoogleMapsProvider>
    </LocationProvider>
  );
}
