'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';
import { ImageOff, Plus, AlertTriangle, Eye, Pencil, Store } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { BarStatusBadge } from '@/components/ui/bar-status-badge';
import { useMyBars } from '@/hooks/queries/use-bars';
import { BarStatus } from '@/types';
import { SKELETON_COUNT } from '@/lib/constants';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: BarStatus.PENDING, label: 'Pending' },
  { value: BarStatus.APPROVED, label: 'Approved' },
  { value: BarStatus.REJECTED, label: 'Rejected' },
] as const;

/** Status summary card colors — using design system semantic tokens */
const STATUS_CARD_STYLES: Record<string, string> = {
  all: 'border-primary/30 bg-primary/10 text-primary',
  [BarStatus.PENDING]: 'border-warning/30 bg-warning/10 text-warning-foreground',
  [BarStatus.APPROVED]: 'border-success/30 bg-success/10 text-success',
  [BarStatus.REJECTED]: 'border-destructive/30 bg-destructive/10 text-destructive',
};

/** Client component for my bars list with status summary, tabs, and quick actions */
export function MyBarsContent() {
  const [status, setStatus] = useQueryState('status', parseAsString.withDefault('all'));
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const statusFilter = status === 'all' ? undefined : (status as BarStatus);
  const { data, isLoading } = useMyBars({ status: statusFilter, page });

  // Status count queries (limit=1 to get only totalItems)
  const { data: allData } = useMyBars({ limit: 1 });
  const { data: pendingData } = useMyBars({ status: BarStatus.PENDING, limit: 1 });
  const { data: approvedData } = useMyBars({ status: BarStatus.APPROVED, limit: 1 });
  const { data: rejectedData } = useMyBars({ status: BarStatus.REJECTED, limit: 1 });

  const bars = data?.items ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const statusCounts = {
    all: allData?.meta.totalItems ?? 0,
    [BarStatus.PENDING]: pendingData?.meta.totalItems ?? 0,
    [BarStatus.APPROVED]: approvedData?.meta.totalItems ?? 0,
    [BarStatus.REJECTED]: rejectedData?.meta.totalItems ?? 0,
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">My Bars</h1>
          <Button asChild>
            <Link href="/bars/new">
              <Plus className="mr-1 size-4" />
              New Bar
            </Link>
          </Button>
        </div>

        {/* Desktop: Status Summary Cards + Tabs */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-4 gap-3">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleStatusChange(tab.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-3 transition-all duration-150 hover:shadow-sm',
                  STATUS_CARD_STYLES[tab.value],
                  status === tab.value && 'ring-2 ring-ring ring-offset-2',
                )}
                data-testid={`my-bars-summary-${tab.value}`}
                aria-label={`${tab.label} ${statusCounts[tab.value]}`}
              >
                <span className="font-mono text-2xl font-semibold">
                  {statusCounts[tab.value]}
                </span>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <Tabs value={status} onValueChange={handleStatusChange}>
              <TabsList>
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    data-testid={`my-bars-status-tab-${tab.value}`}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Mobile: Combined horizontal scroll chips with counts */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide sm:hidden">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusChange(tab.value)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150',
                status === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
              data-testid={`my-bars-status-tab-${tab.value}`}
            >
              {tab.label} ({statusCounts[tab.value]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <Card key={i} className="overflow-hidden py-0">
                <div className="flex">
                  <Skeleton className="h-28 w-28 shrink-0 rounded-none" />
                  <CardContent className="flex flex-1 flex-col justify-center gap-2 p-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-40" />
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        ) : bars.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No bars registered yet"
            description="Share your bar with the world!"
            action={
              <Button asChild variant="outline">
                <Link href="/bars/new">Register New Bar</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              {bars.map((bar) => (
                <Card
                  key={bar.id}
                  data-testid={`my-bars-card-${bar.id}`}
                  className="overflow-hidden py-0 transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="flex">
                    {/* Thumbnail */}
                    <div className="relative h-28 w-28 shrink-0 bg-muted sm:h-32 sm:w-36">
                      {bar.thumbnail ? (
                        <Image
                          src={bar.thumbnail}
                          alt={bar.name}
                          fill
                          className="object-cover"
                          sizes="144px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageOff className="size-8" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <CardContent className="flex flex-1 flex-col justify-center gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="line-clamp-1 font-semibold">{bar.name}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <BarStatusBadge status={bar.status} />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {bar.city}, {bar.country}
                          </p>
                        </div>
                      </div>

                      {/* Rejection warning */}
                      {bar.status === BarStatus.REJECTED && (
                        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                          <span>Review was rejected. Please update the information and resubmit.</span>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/bars/${bar.id}`}>
                            <Eye className="size-4" />
                            View Details
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/bars/${bar.id}/edit`}>
                            <Pencil className="size-4" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
