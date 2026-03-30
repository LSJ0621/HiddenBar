'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Accordion } from '@/components/ui/accordion';

import { useBarDetail, useDeleteMyBar } from '@/hooks/queries/use-bars';
import { useAuthStore } from '@/hooks/use-auth';
import { BookmarkButton } from '@/components/bars/bookmark-button';
import { StatusBanner } from '@/components/ui/status-banner';
import { BarStatus } from '@/types';

import { getTodaySummary, isCurrentlyOpen } from './lib/operating-hours';
import { PhotoGallery } from './photo-gallery';
import { BarInfoHeader } from './bar-info-header';
import { OperatingHoursSection } from './operating-hours-section';
import { MenuSection } from './menu-section';
import { BarDetailSidebar } from './bar-detail-sidebar';
import { ReviewSection } from './review-section';

interface BarDetailViewProps {
  barId: number;
}

/** Client-side bar detail view — composes sub-components for each section */
export function BarDetailView({ barId }: BarDetailViewProps) {
  const { data: bar, isLoading } = useBarDetail(barId);
  const { user } = useAuthStore();
  const router = useRouter();
  const deleteBar = useDeleteMyBar();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  const isOwner = bar && user && bar.owner.id === user.id;

  const handleStickyChange = useCallback((visible: boolean) => {
    setShowStickyHeader(visible);
  }, []);

  const handleDelete = () => {
    deleteBar.mutate(barId, {
      onSuccess: () => {
        router.push('/my-bars');
      },
    });
  };

  if (isLoading) {
    return <BarDetailSkeleton />;
  }

  if (!bar) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Bar not found.</p>
      </div>
    );
  }

  const todaySummary = getTodaySummary(bar.operatingHours);
  const openStatus = isCurrentlyOpen(bar.operatingHours);

  return (
    <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8">
      {/* Mobile Sticky Header */}
      <div
        className={cn(
          'fixed left-0 right-0 top-16 z-30 border-b border-border bg-background/95 backdrop-blur-md transition-transform duration-200 lg:hidden',
          showStickyHeader ? 'translate-y-0' : '-translate-y-full',
        )}
      >
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft className="size-5" />
            </Button>
            <span className="truncate text-sm font-semibold">{bar.name}</span>
          </div>
          <BookmarkButton
            barId={bar.id}
            initialCount={bar.bookmarkCount}
            initialIsBookmarked={bar.isBookmarked}
            testId={`bar-sticky-bookmark-${bar.id}`}
          />
        </div>
      </div>

      <PhotoGallery
        photos={bar.photos}
        barName={bar.name}
        barId={bar.id}
        isOwner={!!isOwner}
      />

      {/* Owner: Status Banner */}
      {isOwner && bar.status === BarStatus.PENDING && (
        <StatusBanner
          status="PENDING"
          message="Review is in progress. It usually takes 1-2 days."
          className="mb-6"
        />
      )}
      {isOwner && bar.status === BarStatus.REJECTED && (
        <StatusBanner
          status="REJECTED"
          message="Your submission was rejected. Please edit and resubmit."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={`/bars/${bar.id}/edit`}>Edit</Link>
            </Button>
          }
          className="mb-6"
        />
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          <BarInfoHeader
            bar={bar}
            isOwner={!!isOwner}
            todaySummary={todaySummary}
            openStatus={openStatus}
            onDeleteClick={() => setDeleteDialogOpen(true)}
            onStickyChange={handleStickyChange}
          />

          <Accordion type="multiple">
            <OperatingHoursSection
              operatingHours={bar.operatingHours}
              todaySummary={todaySummary}
              hoursOpen={hoursOpen}
              onHoursOpenChange={setHoursOpen}
              isOwner={!!isOwner}
              barId={bar.id}
            />

            {(bar.status === BarStatus.APPROVED || isOwner || user?.role === 'ADMIN') && (
              <ReviewSection barId={bar.id} isOwner={!!isOwner} />
            )}
          </Accordion>

          <MenuSection
            menuItems={bar.menuItems}
            isOwner={!!isOwner}
            barId={bar.id}
          />
        </div>

        {/* Sidebar (1/3) */}
        <BarDetailSidebar bar={bar} />
      </div>

      {/* Delete Dialog */}
      {isOwner && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Bar</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{bar.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteBar.isPending}
              >
                {deleteBar.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/** Skeleton loading state for bar detail */
function BarDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8">
      <Skeleton className="mb-6 aspect-[21/9] w-full rounded-lg" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-2">
            <Skeleton className="h-9 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
