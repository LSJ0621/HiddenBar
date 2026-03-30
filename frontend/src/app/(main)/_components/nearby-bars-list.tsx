'use client';

import { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { RatingBadge } from '@/components/ui/rating-badge';
import { useUserLocation } from '@/hooks/use-user-location';
import { useNearbyBars, useSearchBars } from '@/hooks/queries/use-search';
import { BarCard, BarCardSkeleton, BarCardCarouselSkeleton } from '@/components/bars/bar-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchSortBy } from '@/types';
import type { BarSummary, NearbyBar } from '@/types';
import { useAuthStore } from '@/hooks/use-auth';

const FALLBACK_LIMIT = 6;
const emptySubscribe = () => () => {};
const returnTrue = () => true;
const returnFalse = () => false;

/** 벤토 그리드 카드 — 큰 카드 */
function BentoCardLarge({ bar }: { bar: NearbyBar }) {
  return (
    <Link
      href={`/bars/${bar.id}`}
      className="group relative col-span-2 row-span-2 overflow-hidden rounded-tl-2xl rounded-br border border-[#9B5E1A]/10 bg-[#120e0a]"
    >
      {bar.thumbnail ? (
        <Image
          src={bar.thumbnail}
          alt={bar.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1410]">
          <MapPin className="h-12 w-12 text-[#9B5E1A]/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8">
        <h3 className="font-display text-2xl font-light text-[#F0E0C0] mb-1 md:text-3xl">
          {bar.name}
        </h3>
        <p className="text-sm text-[#9a8060] mb-3 line-clamp-2">{bar.address}</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#e8973a]">
            <MapPin className="h-3 w-3" />
            <span className="text-xs font-medium">{bar.distanceKm.toFixed(1)}km</span>
          </span>
          {bar.reviewCount > 0 && (
            <>
              <span className="text-[#9a8060]/40 text-sm">&middot;</span>
              <RatingBadge
                averageRating={bar.averageRating}
                reviewCount={bar.reviewCount}
                size="compact"
                showEmpty={false}
                className="text-[#e8973a]"
              />
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/** 벤토 그리드 카드 — 일반 카드 */
function BentoCard({ bar, className }: { bar: NearbyBar; className?: string }) {
  return (
    <Link
      href={`/bars/${bar.id}`}
      className={`group relative overflow-hidden rounded-tl-2xl rounded-br border border-[#9B5E1A]/10 bg-[#120e0a] ${className ?? ''}`}
    >
      {bar.thumbnail ? (
        <Image
          src={bar.thumbnail}
          alt={bar.name}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1410]">
          <MapPin className="h-8 w-8 text-[#9B5E1A]/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
        <h3 className="font-display text-lg font-light text-[#F0E0C0] mb-1">
          {bar.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[#e8973a]">
            <MapPin className="h-3 w-3" />
            <span className="text-xs font-medium">{bar.distanceKm.toFixed(1)}km</span>
          </span>
          {bar.reviewCount > 0 && (
            <>
              <span className="text-[#9a8060]/40 text-sm">&middot;</span>
              <RatingBadge
                averageRating={bar.averageRating}
                reviewCount={bar.reviewCount}
                size="compact"
                showEmpty={false}
                className="text-[#e8973a]"
              />
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/** 벤토 그리드 스켈레톤 */
function BentoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
      <div className="col-span-1 h-[300px] animate-pulse rounded-tl-2xl rounded-br bg-[#1a1410] md:col-span-2 md:row-span-2 md:h-auto" />
      <div className="col-span-1 h-[200px] animate-pulse rounded-tl-2xl rounded-br bg-[#1a1410] md:col-span-2 md:h-[300px]" />
      <div className="col-span-1 h-[200px] animate-pulse rounded-tl-2xl rounded-br bg-[#1a1410] md:h-[300px]" />
      <div className="col-span-1 h-[200px] animate-pulse rounded-tl-2xl rounded-br bg-[#1a1410] md:h-[300px]" />
    </div>
  );
}

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
        <p className="section-label-line font-mono text-[9px] tracking-[0.42em] uppercase text-[#3ECFB2] mb-3">
          NEARBY LOCATIONS
        </p>
        <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight text-[#F0E0C0]">
          Nearby <em className="text-[#e8973a] italic">Hidden</em> Spots
        </h2>
      </div>
      <Link
        href="/search"
        className="hidden items-center gap-2 font-mono text-xs text-[#3ECFB2] hover:underline md:flex"
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
        <div className="border border-[#9B5E1A]/20 bg-[#080402] p-6 text-center">
          <p className="mb-4 text-sm text-[#9a8060]">
            Log in to discover bars near you
          </p>
          <Button
            asChild
            size="sm"
            className="border border-[#9B5E1A] bg-transparent text-[#e8973a] hover:border-[#e8973a] hover:bg-[rgba(232,151,58,0.1)]"
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
        <div className="mb-6 border border-[#9B5E1A]/20 bg-[#080402] p-6 text-center">
          <p className="font-mono text-[9px] tracking-[0.2em] text-[#3ECFB2] opacity-70 mb-1">
            ▲ 37.5665&deg;N &middot; 126.9780&deg;E
          </p>
          <p className="mb-4 text-sm text-[#9a8060]">
            Allow location access to find bars near you
          </p>
          <Button
            onClick={requestLocation}
            size="sm"
            className="border border-[#9B5E1A] bg-transparent text-[#e8973a] hover:border-[#e8973a] hover:bg-[rgba(232,151,58,0.1)]"
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
            <Button asChild size="sm" className="border border-[#9B5E1A] bg-transparent text-[#e8973a] hover:border-[#e8973a] hover:bg-[rgba(232,151,58,0.1)]">
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

/** Fallback: latest bars when location is denied */
function FallbackLatestBars() {
  const { data, isLoading } = useSearchBars({
    sortBy: SearchSortBy.NEWEST,
    limit: FALLBACK_LIMIT,
  });

  const bars: BarSummary[] = data?.items ?? [];

  if (!isLoading && bars.length === 0) return null;

  return (
    <div>
      <h3 className="mb-4 font-display text-xl font-light text-[#F0E0C0]">Latest Bars</h3>

      {/* Desktop grid */}
      <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: FALLBACK_LIMIT }, (_, i) => (
              <BarCardSkeleton key={i} />
            ))
          : bars.map((bar) => <BarCard key={bar.id} bar={bar} />)}
      </div>

      {/* Mobile carousel */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide md:hidden">
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => (
              <BarCardCarouselSkeleton key={i} />
            ))
          : bars.map((bar) => (
              <BarCard key={bar.id} bar={bar} variant="carousel" />
            ))}
      </div>
    </div>
  );
}
