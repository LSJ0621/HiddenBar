'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Standard 변형 바 카드 스켈레톤 로딩 상태 컴포넌트.
 */
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

/**
 * Carousel 변형 바 카드 스켈레톤 로딩 상태 컴포넌트.
 */
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

/**
 * Horizontal 변형 바 카드 스켈레톤 로딩 상태 컴포넌트.
 */
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

/**
 * MapList 변형 바 카드 스켈레톤 로딩 상태 컴포넌트.
 */
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
