'use client';

import { LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 리뷰 목록 로딩 중 스켈레톤 UI
 */
export function ReviewListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

interface LoginPromptProps {
  /** 로그인 버튼 클릭 핸들러 */
  onLogin: () => void;
}

/**
 * 비로그인 사용자에게 로그인을 유도하는 UI
 */
export function LoginPrompt({ onLogin }: LoginPromptProps) {
  return (
    <div
      data-testid="review-login-prompt"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center"
    >
      <LogIn className="size-8 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">Log in to see reviews</p>
      <Button size="sm" onClick={onLogin}>
        Log In
      </Button>
    </div>
  );
}
