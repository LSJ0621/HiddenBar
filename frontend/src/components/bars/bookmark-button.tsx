'use client';

import { useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/hooks/use-auth';
import { useBookmarkMutation } from '@/hooks/queries/use-search';

interface BookmarkButtonProps {
  barId: number;
  initialCount: number;
  initialIsBookmarked?: boolean;
  className?: string;
  testId?: string;
}

/** 북마크 추가/제거 버튼. action 기반 mutation으로 동작한다. */
export function BookmarkButton({
  barId,
  initialCount,
  initialIsBookmarked = false,
  className,
  testId,
}: BookmarkButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const bookmarkMutation = useBookmarkMutation();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!isAuthenticated) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      bookmarkMutation.mutate(
        { barId, action: initialIsBookmarked ? 'remove' : 'add' },
        {
          onError: () => {
            toast.error('Failed to update bookmark');
          },
        },
      );
    },
    [isAuthenticated, barId, initialIsBookmarked, router, pathname, bookmarkMutation],
  );

  return (
    <Button
      variant="ghost"
      size="xs"
      data-testid={testId ?? `bar-card-bookmark-${barId}`}
      aria-label={initialIsBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      className={cn('gap-1', className)}
      onClick={handleClick}
      disabled={bookmarkMutation.isPending}
    >
      <Bookmark
        className={cn(
          'size-4',
          initialIsBookmarked && 'fill-primary text-primary',
        )}
      />
      <span className="text-xs">{initialCount}</span>
    </Button>
  );
}
