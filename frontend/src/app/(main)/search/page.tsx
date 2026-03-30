import { Suspense } from 'react';
import type { Metadata } from 'next';
import { GoogleMapsProvider } from '@/components/map/google-maps-provider';
import { SearchPageContent } from './_components/search-page-content';

export const metadata: Metadata = {
  title: 'Search | Hidden Bar',
  description: 'Search for hidden bars by name, address, or location on the map',
};

export default function SearchPage() {
  return (
    <GoogleMapsProvider>
      <Suspense
        fallback={
          <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4">
            <p className="text-muted-foreground">Loading search page...</p>
          </div>
        }
      >
        <SearchPageContent />
      </Suspense>
    </GoogleMapsProvider>
  );
}
