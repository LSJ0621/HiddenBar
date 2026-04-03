'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { useUserLocation } from '@/hooks/use-user-location';
import { useNearbyBars } from '@/hooks/queries/use-search';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuthStore } from '@/hooks/use-auth';
import { BentoCardLarge, BentoCard, BentoSkeleton } from '@/app/(main)/_components/nearby-bento-cards';
import { FallbackLatestBars } from '@/app/(main)/_components/fallback-latest-bars';

const emptySubscribe = () => () => {};
const returnTrue = () => true;
const returnFalse = () => false;

/** Nearby bars section with bento grid layout */
export function NearbyBarsList() {
  const mounted = useSyncExternalStore(emptySubscribe, returnTrue, returnFalse);
  const { isAuthenticated } = useAuthStore();
  const { location, isLoading: isLocationLoading, isPermissionDenied, requestLocation } =
    useUserLocation();
  const { data: nearbyData, isLoading: isBarsLoading } = useNearbyBars(
    isAuthenticated ? location?.latitude : undefined,
    isAuthenticated ? location?.longitude : undefined,
  );

  const bars = nearbyData?.items ?? [];

  if (!mounted) {
    return (
      <section className="py-16 md:py-24">
        <BentoSkeleton />
      </section>
    );
  }

  const sectionHeader = (
    <div className="mb-12 flex items-end justify-between md:mb-16">
      <div>
        <p className="section-label-line font-mono text-[9px] tracking-[0.42em] uppercase text-landing-teal mb-3">
          NEARBY LOCATIONS
        </p>
        <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight text-landing-cream">
          Nearby <em className="text-landing-amber italic">Hidden</em> Spots
        </h2>
      </div>
      <Link
        href="/search"
        className="hidden items-center gap-2 font-mono text-xs text-landing-teal hover:underline md:flex"
      >
        View All
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </Link>
    </div>
  );

  // Not authenticated — show login CTA
  if (!isAuthenticated) {
    return (
      <section className="py-16 md:py-24">
        {sectionHeader}
        <div className="border border-landing-brown/20 bg-[#080402] p-6 text-center">
          <p className="mb-4 text-sm text-landing-tan">
            Log in to discover bars near you
          </p>
          <Button
            asChild
            size="sm"
            className="border border-landing-brown bg-transparent text-landing-amber hover:border-landing-amber hover:bg-landing-amber/10"
          >
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </section>
    );
  }

  // Location denied — show fallback
  if (isPermissionDenied) {
    return (
      <section className="py-16 md:py-24">
        {sectionHeader}
        <div className="mb-6 border border-landing-brown/20 bg-[#080402] p-6 text-center">
          <p className="font-mono text-[9px] tracking-[0.2em] text-landing-teal opacity-70 mb-1">
            ▲ 37.5665&deg;N &middot; 126.9780&deg;E
          </p>
          <p className="mb-4 text-sm text-landing-tan">
            Allow location access to find bars near you
          </p>
          <Button
            onClick={requestLocation}
            size="sm"
            className="border border-landing-brown bg-transparent text-landing-amber hover:border-landing-amber hover:bg-landing-amber/10"
          >
            Allow Location
          </Button>
        </div>
        <FallbackLatestBars />
      </section>
    );
  }

  // Waiting for location
  if (isLocationLoading || !location) return null;

  // No nearby bars found
  if (!isBarsLoading && bars.length === 0) {
    return (
      <section className="py-16 md:py-24">
        {sectionHeader}
        <EmptyState
          icon={MapPin}
          title="No bars found nearby"
          description="Try searching in another area"
          action={
            <Button asChild size="sm" className="border border-landing-brown bg-transparent text-landing-amber hover:border-landing-amber hover:bg-landing-amber/10">
              <Link href="/search">Search Bars</Link>
            </Button>
          }
          className="py-8"
        />
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24">
      {sectionHeader}

      {isBarsLoading ? (
        <BentoSkeleton />
      ) : (
        <>
          {/* Desktop: Bento grid */}
          <div className="hidden gap-4 md:grid md:grid-cols-4 md:grid-rows-2">
            {/* 좌측 큰 카드 (2x2) */}
            {bars[0] && <BentoCardLarge bar={bars[0]} />}
            {/* 우측 상단 넓은 카드 */}
            {bars[1] && <BentoCard bar={bars[1]} className="col-span-2 h-[300px]" />}
            {/* 우측 하단 작은 카드 2개 */}
            {bars[2] && <BentoCard bar={bars[2]} className="h-[300px]" />}
            {bars[3] && <BentoCard bar={bars[3]} className="h-[300px]" />}
          </div>

          {/* Mobile: vertical stack */}
          <div className="flex flex-col gap-4 md:hidden">
            {bars.slice(0, 4).map((bar) => (
              <BentoCard key={bar.id} bar={bar} className="h-[220px]" />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
