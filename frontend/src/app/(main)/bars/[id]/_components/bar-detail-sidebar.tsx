'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Phone, Globe, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DirectionsSheet } from '@/components/map/directions-sheet';
import { useOnboarding } from '@/components/onboarding/use-onboarding';

import { Card, CardContent } from '@/components/ui/card';
import { MapView } from '@/components/map/map-view';
import { BarMarker } from '@/components/map/bar-marker';
import { RelatedBarsList } from '@/components/map/related-bars-list';

interface BarLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

interface BarDetailSidebarProps {
  bar: BarLocation & {
    address: string;
    city: string;
    country: string;
    phone: string | null;
    website: string | null;
  };
}

/** Sidebar with mini-map, contact card, and related bars */
export const BarDetailSidebar = React.memo(function BarDetailSidebar({
  bar,
}: BarDetailSidebarProps) {
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const { state: onboardingState } = useOnboarding();
  const directionsButtonRef = useRef<HTMLButtonElement>(null);

  /** 온보딩 Step 7: Directions 버튼이 보이도록 스크롤 */
  useEffect(() => {
    if (
      onboardingState.phase === 'active' &&
      onboardingState.currentStep === 7 &&
      directionsButtonRef.current
    ) {
      directionsButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [onboardingState.phase, onboardingState.currentStep]);

  const handleCopyAddress = () => {
    const fullAddress = `${bar.address}, ${bar.city}, ${bar.country}`;
    navigator.clipboard?.writeText(fullAddress).then(() => {
      toast.success('Address copied to clipboard');
    });
  };

  return (
    <div className="space-y-6">
      {/* Mini Map + Directions */}
      <Card>
        <CardContent className="p-0">
          <div className="h-64 overflow-hidden rounded-t-lg">
            <MapView
              center={{ lat: bar.latitude, lng: bar.longitude }}
              zoom={15}
              className="h-full w-full"
            >
              <BarMarker
                bar={{
                  id: bar.id,
                  name: bar.name,
                  latitude: bar.latitude,
                  longitude: bar.longitude,
                }}
              />
            </MapView>
          </div>
          <div className="p-4">
            <Button
              ref={directionsButtonRef}
              id="directions-button"
              variant="outline"
              className="w-full"
              onClick={() => setDirectionsOpen(true)}
            >
              <Navigation className="mr-2 size-4" />
              Directions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Card — desktop only (mobile uses BarInfoHeader inline contact) */}
      <Card className="hidden lg:block">
        <CardContent className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">Contact</h3>
          <div className="space-y-2 text-sm">
            <button
              className="flex w-full items-center gap-2 text-left transition-colors hover:text-primary"
              aria-label="Copy address"
              onClick={handleCopyAddress}
            >
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span className="break-words">{bar.address}, {bar.city}</span>
            </button>
            {bar.phone && (
              <a href={`tel:${bar.phone}`} className="flex items-center gap-2 transition-colors hover:text-primary">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                {bar.phone}
              </a>
            )}
            {bar.website && (
              <a
                href={bar.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-primary"
              >
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{bar.website}</span>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Related Bars */}
      <RelatedBarsList
        latitude={bar.latitude}
        longitude={bar.longitude}
        currentBarId={bar.id}
      />

      <DirectionsSheet
        bar={{
          id: bar.id,
          name: bar.name,
          address: bar.address,
          city: bar.city,
          country: bar.country,
          latitude: bar.latitude,
          longitude: bar.longitude,
        }}
        open={directionsOpen}
        onOpenChange={setDirectionsOpen}
      />
    </div>
  );
});
