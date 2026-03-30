'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReviewStatus } from '@my-project/shared';
import { REVIEW_STATUS_LABELS } from '@/lib/constants';
import { useModerateReview } from '@/hooks/queries/use-admin-reviews';

interface ReviewModerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: number;
  barId: number;
  currentStatus: ReviewStatus;
}

/** 관리자 리뷰 상태 변경 다이얼로그 */
export function ReviewModerateDialog({
  open,
  onOpenChange,
  reviewId,
  barId,
  currentStatus,
}: ReviewModerateDialogProps) {
  const [status, setStatus] = useState<ReviewStatus>(currentStatus);
  const [reason, setReason] = useState('');
  const moderate = useModerateReview(barId);

  const handleConfirm = async () => {
    await moderate.mutateAsync({
      reviewId,
      dto: { status, reason: reason.trim() || undefined },
    });
    setReason('');
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStatus(currentStatus);
      setReason('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Review Status</DialogTitle>
          <DialogDescription>
            Update the visibility status of this review.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as ReviewStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ReviewStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {REVIEW_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="moderate-reason">Reason (optional)</Label>
            <Textarea
              id="moderate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for status change..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={moderate.isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={moderate.isPending || status === currentStatus}>
            {moderate.isPending && <Loader2 className="size-4 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
