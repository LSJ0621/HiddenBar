'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  changeRate?: number;
  secondaryLabel?: string;
  'data-testid'?: string;
}

/** 대시보드 통계 카드. 증감률 또는 보조 텍스트를 선택적으로 표시한다. */
export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  changeRate,
  secondaryLabel,
  'data-testid': testId,
}: StatCardProps) {
  const secondaryText = changeRate !== undefined ? (
    <span
      className={cn(
        'text-[10px] font-medium sm:text-xs',
        changeRate > 0 && 'text-success',
        changeRate < 0 && 'text-destructive',
        changeRate === 0 && 'text-muted-foreground',
      )}
    >
      {changeRate > 0 ? '▲' : changeRate < 0 ? '▼' : '—'}{' '}
      {Math.abs(changeRate)}%
      <span className="hidden sm:inline"> vs last week</span>
    </span>
  ) : secondaryLabel ? (
    <span className="text-[10px] text-muted-foreground sm:text-xs">{secondaryLabel}</span>
  ) : description ? (
    <span className="text-[10px] text-muted-foreground sm:text-xs">{description}</span>
  ) : null;

  return (
    <Card data-testid={testId} className="border-l-2 border-l-primary/40 transition-shadow duration-200 hover:shadow-md">
      {/* 모바일: 컴팩트 1행 레이아웃 */}
      <div className="flex items-center gap-2 p-2.5 sm:hidden">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Icon className="size-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] leading-tight text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-semibold leading-tight tracking-tight">{value}</span>
            {secondaryText}
          </div>
        </div>
      </div>
      {/* sm 이상: 기존 레이아웃 */}
      <CardHeader className="hidden flex-row items-center justify-between pb-2 sm:flex">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="hidden sm:block">
        <div className="font-display text-2xl font-semibold tracking-tight">{value}</div>
        {secondaryText}
      </CardContent>
    </Card>
  );
}
