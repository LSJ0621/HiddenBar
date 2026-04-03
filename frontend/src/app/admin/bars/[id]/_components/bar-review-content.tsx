'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Check, X, Trash2 } from 'lucide-react';
import { showErrorToast } from '@/lib/error-utils';
import {
  useAdminBarDetail,
  useApproveBar,
  useRejectBar,
  useAdminDeleteBar,
} from '@/hooks/queries/use-admin';
import { DetailRow } from '@/components/admin/detail-row';
import { ApproveRejectDialog } from '@/components/admin/approve-reject-dialog';
import { BarStatusBadge } from '@/components/ui/bar-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { BarStatus } from '@/types';
import { cn } from '@/lib/utils';

interface BarReviewContentProps {
  params: Promise<{ id: string }>;
}

/** Bar review detail page with approve/reject/delete actions */
export function BarReviewContent({ params }: BarReviewContentProps) {
  const { id: idStr } = use(params);
  const id = Number(idStr);
  const router = useRouter();
  const { data: bar, isLoading } = useAdminBarDetail(id);
  const approveBar = useApproveBar();
  const rejectBar = useRejectBar();
  const deleteBar = useAdminDeleteBar();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleApprove = async (reason: string) => {
    try {
      await approveBar.mutateAsync({ id, reason: reason || undefined });
      toast.success('Bar has been approved');
      router.push('/admin/bars');
    } catch (error) {
      showErrorToast(error, 'Failed to approve');
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectBar.mutateAsync({ id, reason });
      toast.success('Bar has been rejected');
      router.push('/admin/bars');
    } catch (error) {
      showErrorToast(error, 'Failed to reject');
    }
  };

  const handleDelete = async (reason: string) => {
    try {
      await deleteBar.mutateAsync({ id, reason: reason || undefined });
      toast.success('Bar has been deleted');
      router.push('/admin/bars');
    } catch (error) {
      showErrorToast(error, 'Failed to delete');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="text-center text-muted-foreground">
        Bar not found
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push('/admin/bars')}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight truncate">{bar.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <BarStatusBadge status={bar.status} />
              {bar.rejectionReason && (
                <span className="text-sm text-destructive">
                  Rejection reason: {bar.rejectionReason}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {bar.status === BarStatus.PENDING && (
            <>
              <Button onClick={() => setApproveOpen(true)}>
                <Check className="size-4" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>
                <X className="size-4" />
                Reject
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      {/* Bar details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Description" value={bar.description || '-'} />
            <DetailRow label="Address" value={bar.address} />
            <DetailRow label="City" value={bar.city} />
            <DetailRow label="Country" value={bar.country} />
            <DetailRow
              label="Coordinates"
              value={`${bar.latitude}, ${bar.longitude}`}
            />
            <DetailRow
              label="Created"
              value={new Date(bar.createdAt).toLocaleDateString('en-US')}
            />
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Owner & Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Owner" value={bar.owner.name} />
            <DetailRow label="Owner Email" value={bar.owner.email} />
            <DetailRow label="Photos" value={String(bar.photoCount)} />
            <DetailRow label="Bookmarks" value={String(bar.bookmarkCount)} />
          </CardContent>
        </Card>
      </div>

      {/* Photos */}
      {bar.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photos ({bar.photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {bar.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group aspect-square overflow-hidden rounded-lg border border-border/50"
                >
                  <img
                    src={photo.url}
                    alt={bar.name}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      {bar.menuItems && bar.menuItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Menu ({bar.menuItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bar.menuItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/30">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {item.price.toLocaleString()} {item.currency}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operating Hours */}
      {bar.operatingHours && bar.operatingHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operating Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {bar.operatingHours.map((h, index) => (
                <div key={h.id} className={cn('flex items-center justify-between rounded-md px-2 py-1.5 text-sm', index % 2 === 0 && 'bg-muted/20')}>
                  <span className="font-medium">{h.dayOfWeek}</span>
                  {h.isClosed ? (
                    <span className="text-muted-foreground">Closed</span>
                  ) : (
                    <span>{h.openTime} - {h.closeTime}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ApproveRejectDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Bar"
        description={`Are you sure you want to approve '${bar.name}'?`}
        actionLabel="Approve"
        onConfirm={handleApprove}
      />
      <ApproveRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Bar"
        description={`Are you sure you want to reject '${bar.name}'? Please enter a reason.`}
        actionLabel="Reject"
        variant="destructive"
        requireReason
        onConfirm={handleReject}
      />
      <ApproveRejectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Bar"
        description={`Are you sure you want to delete '${bar.name}'? This action cannot be undone.`}
        actionLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
