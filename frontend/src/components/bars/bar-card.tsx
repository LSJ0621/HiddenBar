'use client';

import type { BarSummary } from '@/types';
import { StandardCard, CompactCard, CarouselCard, HorizontalCard, MapListCard } from '@/components/bars/bar-card-variants';

// 스켈레톤 컴포넌트 re-export (기존 import 호환성 유지)
export { BarCardSkeleton, BarCardCarouselSkeleton, BarCardHorizontalSkeleton, BarCardMapListSkeleton } from '@/components/bars/bar-card-skeletons';

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

type BarCardProps =
  | StandardBarCardProps
  | CompactBarCardProps
  | CarouselBarCardProps
  | HorizontalBarCardProps
  | MapListBarCardProps;

/**
 * 바 요약 카드 컴포넌트. variant prop에 따라 Standard, Compact, Carousel, Horizontal, MapList 변형을 렌더링한다.
 */
export function BarCard(props: BarCardProps) {
  const { bar, showBookmark = true, highlighted = false, priority = false, variant = 'standard' } = props;

  if (variant === 'compact') {
    return <CompactCard bar={bar} showBookmark={showBookmark} highlighted={highlighted} priority={priority} />;
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

  return <StandardCard bar={bar} showBookmark={showBookmark} highlighted={highlighted} priority={priority} />;
}
