'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ImageOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { BarSummary } from '@/types';
import { BookmarkButton } from '@/components/bars/bookmark-button';
import { RatingBadge } from '@/components/ui/rating-badge';

interface BarCardBaseProps {
  bar: BarSummary;
  showBookmark?: boolean;
  highlighted?: boolean;
  priority?: boolean;
}

interface StandardBarCardProps extends BarCardBaseProps {
  variant?: 'standard';
}

interface CompactBarCardProps extends BarCardBaseProps {
  variant: 'compact';
}

interface CarouselBarCardProps extends BarCardBaseProps {
  variant: 'carousel';
  distanceKm?: number;
}

interface HorizontalBarCardProps extends BarCardBaseProps {
  variant: 'horizontal';
  distanceKm?: number;
  similarityScore?: number;
}

interface MapListBarCardProps extends BarCardBaseProps {
  variant: 'map-list';
  distanceKm?: number;
  selected?: boolean;
}

type BarCardProps = StandardBarCardProps | CompactBarCardProps | CarouselBarCardProps | HorizontalBarCardProps | MapListBarCardProps;

/** Bar summary card with Standard, Compact, Carousel, and Horizontal variants */
export function BarCard(props: BarCardProps) {
  const { bar, showBookmark = true, highlighted = false, priority = false, variant = 'standard' } = props;

  if (variant === 'compact') {
    return (
      <CompactCard bar={bar} showBookmark={showBookmark} highlighted={highlighted} priority={priority} />
    );
  }

  if (variant === 'carousel') {
    return (
      <CarouselCard
        bar={bar}
        showBookmark={showBookmark}
        priority={priority}
        distanceKm={'distanceKm' in props ? props.distanceKm : undefined}
      />
    );
  }

  if (variant === 'map-list') {
    return (
      <MapListCard
        bar={bar}
        priority={priority}
        distanceKm={'distanceKm' in props ? props.distanceKm : undefined}
        selected={'selected' in props ? props.selected : false}
      />
    );
  }

  if (variant === 'horizontal') {
    return (
      <HorizontalCard
        bar={bar}
        showBookmark={showBookmark}
        highlighted={highlighted}
        priority={priority}
        distanceKm={'distanceKm' in props ? props.distanceKm : undefined}
        similarityScore={'similarityScore' in props ? props.similarityScore : undefined}
      />
    );
  }

  return (
    <StandardCard bar={bar} showBookmark={showBookmark} highlighted={highlighted} priority={priority} />
  );
}

/** Standard variant — vertical card: photo (4/3) + name + badges */
function StandardCard({ bar, showBookmark, highlighted, priority }: BarCardBaseProps) {
  return (
    <Card
      data-testid={`bar-card-${bar.id}`}
      className={cn(
        'relative overflow-hidden py-0 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        highlighted && 'ring-2 ring-primary/30 bg-accent',
      )}
    >
      <div className="relative aspect-[2/1] w-full bg-muted md:aspect-[5/3]">
        <BarThumbnail src={bar.thumbnail} alt={bar.name} sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" priority={priority} />
        {showBookmark && (
          <div className="absolute right-2 top-2 z-10">
            <BookmarkButton barId={bar.id} initialCount={bar.bookmarkCount} initialIsBookmarked={bar.isBookmarked} />
          </div>
        )}
      </div>
      <CardContent className="space-y-0.5 p-2 md:space-y-1 md:p-3">
        <h3 className="line-clamp-1 text-sm font-semibold md:text-base">
          <Link href={`/bars/${bar.id}`} className="after:absolute after:inset-0">
            {bar.name}
          </Link>
        </h3>
        <div className="flex items-center gap-2">
          <RatingBadge averageRating={bar.averageRating} reviewCount={bar.reviewCount} showEmpty />
        </div>
        <p className="text-xs text-muted-foreground md:text-sm">
          {bar.city}, {bar.country}
        </p>
      </CardContent>
    </Card>
  );
}

/** Compact variant — horizontal card: left photo (96px) + right info */
function CompactCard({ bar, showBookmark, highlighted, priority }: BarCardBaseProps) {
  return (
    <Card
      data-testid={`bar-card-${bar.id}`}
      className={cn(
        'relative overflow-hidden py-0 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        highlighted && 'ring-2 ring-primary/30 bg-accent',
      )}
    >
      <div className="flex">
        <div className="relative h-24 w-24 shrink-0 bg-muted">
          <BarThumbnail src={bar.thumbnail} alt={bar.name} sizes="96px" priority={priority} />
        </div>
        <CardContent className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold">
              <Link href={`/bars/${bar.id}`} className="after:absolute after:inset-0">
                {bar.name}
              </Link>
            </h3>
            {showBookmark && (
              <div className="relative z-10">
                <BookmarkButton barId={bar.id} initialCount={bar.bookmarkCount} initialIsBookmarked={bar.isBookmarked} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <RatingBadge averageRating={bar.averageRating} reviewCount={bar.reviewCount} size="compact" showEmpty={false} />
          </div>
          <p className="text-xs text-muted-foreground">
            {bar.city}, {bar.country}
          </p>
        </CardContent>
      </div>
    </Card>
  );
}

/** Carousel variant — narrow vertical card (200px) for horizontal scroll */
function CarouselCard({
  bar,
  showBookmark,
  priority,
  distanceKm,
}: BarCardBaseProps & { distanceKm?: number }) {
  return (
    <Card
      data-testid={`bar-card-${bar.id}`}
      className="relative w-[160px] shrink-0 snap-center overflow-hidden py-0 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 md:w-[200px]"
    >
      <div className="relative aspect-[4/3] w-full bg-muted">
        <BarThumbnail src={bar.thumbnail} alt={bar.name} sizes="200px" priority={priority} />
        {showBookmark && (
          <div className="absolute right-1.5 top-1.5 z-10">
            <BookmarkButton barId={bar.id} initialCount={bar.bookmarkCount} initialIsBookmarked={bar.isBookmarked} />
          </div>
        )}
      </div>
      <CardContent className="space-y-1 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold">
          <Link href={`/bars/${bar.id}`} className="after:absolute after:inset-0">
            {bar.name}
          </Link>
        </h3>
        <div className="flex items-center gap-1.5">
          <RatingBadge averageRating={bar.averageRating} reviewCount={bar.reviewCount} size="compact" showEmpty={false} />
          {distanceKm !== undefined && (
            <span className="text-xs text-muted-foreground">
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)}m`
                : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Horizontal variant — full-width row: left photo (160px) + right detailed info */
function HorizontalCard({
  bar,
  showBookmark,
  highlighted,
  priority,
  distanceKm,
}: BarCardBaseProps & { distanceKm?: number; similarityScore?: number }) {
  return (
    <Card
      data-testid={`bar-card-${bar.id}`}
      className={cn(
        'relative overflow-hidden py-0 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        highlighted && 'ring-2 ring-primary/30 bg-accent',
      )}
    >
      <div className="flex">
        <div className="relative h-20 w-20 shrink-0 bg-muted sm:h-24 sm:w-28 md:h-28 md:w-36">
          <BarThumbnail src={bar.thumbnail} alt={bar.name} sizes="(max-width: 640px) 112px, (max-width: 768px) 160px, 192px" priority={priority} />
        </div>
        <CardContent className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-3 sm:gap-2 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold sm:text-base md:text-lg">
              <Link href={`/bars/${bar.id}`} className="after:absolute after:inset-0">
                {bar.name}
              </Link>
            </h3>
            {showBookmark && (
              <div className="relative z-10 shrink-0">
                <BookmarkButton barId={bar.id} initialCount={bar.bookmarkCount} initialIsBookmarked={bar.isBookmarked} />
              </div>
            )}
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {bar.address || `${bar.city}, ${bar.country}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <RatingBadge averageRating={bar.averageRating} reviewCount={bar.reviewCount} showEmpty />
            {distanceKm !== undefined && (
              <span className="text-xs text-muted-foreground">
                {distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)}m away`
                  : `${distanceKm.toFixed(1)}km away`}
              </span>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

/** Skeleton placeholder for Horizontal BarCard loading state */
export function BarCardHorizontalSkeleton() {
  return (
    <Card className="overflow-hidden py-0">
      <div className="flex">
        <Skeleton className="h-28 w-28 shrink-0 rounded-none sm:h-32 sm:w-40 md:h-36 md:w-48" />
        <CardContent className="flex flex-1 flex-col justify-center gap-2 p-3 sm:p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

/** Map-list variant — compact row: 48px thumbnail + name/distance/price */
function MapListCard({
  bar,
  priority,
  distanceKm,
  selected,
}: BarCardBaseProps & { distanceKm?: number; selected?: boolean }) {
  return (
    <div
      data-testid={`bar-card-${bar.id}`}
      className={cn(
        'relative flex items-center gap-3 border-b border-border px-3 py-2 transition-colors',
        selected && 'bg-accent/50 border-l-2 border-l-primary',
      )}
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
        <BarThumbnail src={bar.thumbnail} alt={bar.name} sizes="48px" priority={priority} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-sm font-medium">
          <Link href={`/bars/${bar.id}`} className="after:absolute after:inset-0">
            {bar.name}
          </Link>
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {distanceKm !== undefined && (
            <span>
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)}m`
                : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
          <RatingBadge averageRating={bar.averageRating} reviewCount={bar.reviewCount} size="compact" showEmpty={false} />
        </div>
      </div>
    </div>
  );
}

/** Skeleton placeholder for MapList BarCard loading state */
export function BarCardMapListSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-3 py-2">
      <Skeleton className="size-12 shrink-0 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Shared thumbnail component */
function BarThumbnail({
  src,
  alt,
  sizes,
  priority,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <ImageOff className="size-8" />
    </div>
  );
}

/** Skeleton placeholder for Standard BarCard loading state */
export function BarCardSkeleton() {
  return (
    <Card className="overflow-hidden py-0">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <CardContent className="space-y-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

/** Skeleton placeholder for Carousel BarCard loading state */
export function BarCardCarouselSkeleton() {
  return (
    <Card className="w-[160px] shrink-0 snap-center overflow-hidden py-0 md:w-[200px]">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <CardContent className="space-y-1 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}
