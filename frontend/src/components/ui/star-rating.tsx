'use client';

import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StarRatingProps {
  /** 현재 별점 (1~5) */
  value: number;
  /** 인터랙티브 모드에서 별점 변경 핸들러 */
  onChange?: (rating: number) => void;
  /** 별 크기 (tailwind size class) */
  size?: 'sm' | 'md' | 'lg';
  /** 추가 클래스 */
  className?: string;
}

const SIZE_MAP = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const;

/** 별점 공용 컴포넌트 — display/interactive 두 모드 지원 */
export function StarRating({ value, onChange, size = 'md', className }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const interactive = !!onChange;
  const displayValue = hoverValue || value;

  const handleClick = useCallback(
    (rating: number) => {
      onChange?.(rating);
    },
    [onChange],
  );

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Rating' : `${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= displayValue;

        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              className="cursor-pointer p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
              onClick={() => handleClick(star)}
              onMouseEnter={() => setHoverValue(star)}
              onMouseLeave={() => setHoverValue(0)}
            >
              <Star
                className={cn(
                  SIZE_MAP[size],
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-muted-foreground/40',
                )}
              />
            </button>
          );
        }

        return (
          <Star
            key={star}
            className={cn(
              SIZE_MAP[size],
              filled
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-muted-foreground/40',
            )}
          />
        );
      })}
    </div>
  );
}
