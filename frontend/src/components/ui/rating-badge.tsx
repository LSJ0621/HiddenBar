import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingBadgeProps {
  averageRating: number;
  reviewCount: number;
  /** compact: 리뷰 수 생략, 별 + 숫자만 */
  size?: 'default' | 'compact';
  /** reviewCount=0일 때 "New" 표시 여부 (default: true) */
  showEmpty?: boolean;
  className?: string;
}

/**
 * 별점과 리뷰 수를 일관되게 표시하는 배지 컴포넌트.
 * reviewCount === 0이고 showEmpty가 false이면 아무것도 렌더링하지 않는다.
 */
export function RatingBadge({
  averageRating,
  reviewCount,
  size = 'default',
  showEmpty = true,
  className,
}: RatingBadgeProps) {
  if (reviewCount === 0) {
    if (!showEmpty) return null;
    return (
      <span className={cn('inline-flex items-center text-xs text-muted-foreground', className)}>
        New
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <Star className="size-3 fill-amber-400 text-amber-400" />
      <span className="font-medium">{averageRating.toFixed(1)}</span>
      {size === 'default' && (
        <span className="text-muted-foreground">({reviewCount})</span>
      )}
    </span>
  );
}
