'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';
import { formatDistance } from '@/lib/format-utils';
import { Card, CardContent } from '@/components/ui/card';
import { BookmarkButton } from '@/components/bars/bookmark-button';
import { RatingBadge } from '@/components/ui/rating-badge';
import { BarThumbnail } from '@/components/bars/bar-thumbnail';
import type { BarSummary } from '@/types';

interface BarCardBaseProps {
  bar: BarSummary;
  showBookmark?: boolean;
  highlighted?: boolean;
  priority?: boolean;
}

/**
 * Standard 변형 바 카드 컴포넌트.
 * 세로 레이아웃: 상단 4/3 비율 사진 + 하단 이름/평점/위치 정보.
 */
export function StandardCard({ bar, showBookmark, highlighted, priority }: BarCardBaseProps) {
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

/**
 * Compact 변형 바 카드 컴포넌트.
 * 가로 레이아웃: 왼쪽 96px 사진 + 오른쪽 이름/평점/위치 정보.
 */
export function CompactCard({ bar, showBookmark, highlighted, priority }: BarCardBaseProps) {
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

/**
 * Carousel 변형 바 카드 컴포넌트.
 * 가로 스크롤용 좁은 세로 카드 (모바일 160px, 데스크톱 200px).
 */
export function CarouselCard({
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
              {formatDistance(distanceKm)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Horizontal 변형 바 카드 컴포넌트.
 * 전체 너비 가로 레이아웃: 왼쪽 사진 + 오른쪽 상세 정보 (주소, 평점, 거리).
 */
export function HorizontalCard({
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
                {formatDistance(distanceKm)} away
              </span>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

/**
 * MapList 변형 바 카드 컴포넌트.
 * 지도 사이드 목록용 컴팩트 행 레이아웃: 48px 썸네일 + 이름/거리/평점.
 */
export function MapListCard({
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
            <span>{formatDistance(distanceKm)}</span>
          )}
          <RatingBadge averageRating={bar.averageRating} reviewCount={bar.reviewCount} size="compact" showEmpty={false} />
        </div>
      </div>
    </div>
  );
}
