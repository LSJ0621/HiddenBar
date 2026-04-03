'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { RatingBadge } from '@/components/ui/rating-badge';
import type { NearbyBar } from '@/types';

/**
 * 벤토 그리드 카드 — 큰 카드 (2×2 크기, 대표 이미지 강조)
 */
export function BentoCardLarge({ bar }: { bar: NearbyBar }) {
  return (
    <Link
      href={`/bars/${bar.id}`}
      className="group relative col-span-2 row-span-2 overflow-hidden rounded-tl-2xl rounded-br border border-landing-brown/10 bg-landing-charcoal"
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
        <div className="absolute inset-0 flex items-center justify-center bg-landing-deep">
          <MapPin className="h-12 w-12 text-landing-brown/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8">
        <h3 className="font-display text-2xl font-light text-landing-cream mb-1 md:text-3xl">
          {bar.name}
        </h3>
        <p className="text-sm text-landing-tan mb-3 line-clamp-2">{bar.address}</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-landing-amber">
            <MapPin className="h-3 w-3" />
            <span className="text-xs font-medium">{bar.distanceKm.toFixed(1)}km</span>
          </span>
          {bar.reviewCount > 0 && (
            <>
              <span className="text-landing-tan/40 text-sm">&middot;</span>
              <RatingBadge
                averageRating={bar.averageRating}
                reviewCount={bar.reviewCount}
                size="compact"
                showEmpty={false}
                className="text-landing-amber"
              />
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * 벤토 그리드 카드 — 일반 카드 (가변 크기, className으로 제어)
 */
export function BentoCard({ bar, className }: { bar: NearbyBar; className?: string }) {
  return (
    <Link
      href={`/bars/${bar.id}`}
      className={`group relative overflow-hidden rounded-tl-2xl rounded-br border border-landing-brown/10 bg-landing-charcoal ${className ?? ''}`}
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
        <div className="absolute inset-0 flex items-center justify-center bg-landing-deep">
          <MapPin className="h-8 w-8 text-landing-brown/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6">
        <h3 className="font-display text-lg font-light text-landing-cream mb-1">
          {bar.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-landing-amber">
            <MapPin className="h-3 w-3" />
            <span className="text-xs font-medium">{bar.distanceKm.toFixed(1)}km</span>
          </span>
          {bar.reviewCount > 0 && (
            <>
              <span className="text-landing-tan/40 text-sm">&middot;</span>
              <RatingBadge
                averageRating={bar.averageRating}
                reviewCount={bar.reviewCount}
                size="compact"
                showEmpty={false}
                className="text-landing-amber"
              />
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * 벤토 그리드 로딩 스켈레톤 — 데이터 로딩 중 표시되는 플레이스홀더
 */
export function BentoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
      <div className="col-span-1 h-[300px] animate-pulse rounded-tl-2xl rounded-br bg-landing-deep md:col-span-2 md:row-span-2 md:h-auto" />
      <div className="col-span-1 h-[200px] animate-pulse rounded-tl-2xl rounded-br bg-landing-deep md:col-span-2 md:h-[300px]" />
      <div className="col-span-1 h-[200px] animate-pulse rounded-tl-2xl rounded-br bg-landing-deep md:h-[300px]" />
      <div className="col-span-1 h-[200px] animate-pulse rounded-tl-2xl rounded-br bg-landing-deep md:h-[300px]" />
    </div>
  );
}
