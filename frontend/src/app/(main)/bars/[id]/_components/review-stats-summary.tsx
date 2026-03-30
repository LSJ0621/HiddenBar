'use client';

import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ReviewStats } from '@/types/review';

interface ReviewStatsSummaryProps {
  stats: ReviewStats;
  className?: string;
}

/** 리뷰 통계 요약 — 평균 별점, 리뷰 수, 별점 분포 바 차트 */
export function ReviewStatsSummary({ stats, className }: ReviewStatsSummaryProps) {
  const { averageRating, totalCount, distribution } = stats;

  return (
    <div data-testid="review-stats-summary" className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8', className)}>
      {/* 평균 별점 */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tabular-nums">
            {totalCount > 0 ? averageRating.toFixed(1) : '—'}
          </span>
          <span className="text-sm text-muted-foreground">/ 5</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'size-4',
                star <= Math.round(averageRating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-muted-foreground/40',
              )}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {totalCount} review{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* 별점 분포 */}
      <div className="flex flex-1 flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((rating) => {
          const item = distribution.find((d) => d.rating === rating);
          const count = item?.count ?? 0;
          const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

          return (
            <div key={rating} className="flex items-center gap-2 text-sm">
              <span className="w-3 text-right tabular-nums text-muted-foreground">{rating}</span>
              <Star className="size-3 fill-amber-400 text-amber-400" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
