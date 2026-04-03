'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/error-utils';

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
import { ReportReason } from '@my-project/shared';
import { REPORT_REASON_LABELS } from '@/lib/constants';
import { useReportReview } from '@/hooks/queries/use-review-reports';

interface ReviewReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: number;
  barId: number;
}

/** 리뷰 신고 다이얼로그 */
export function ReviewReportDialog({
  open,
  onOpenChange,
  reviewId,
  barId,
}: ReviewReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [detail, setDetail] = useState('');
  const [prevOpen, setPrevOpen] = useState(open);
  const reportMutation = useReportReview(barId);

  /** 다이얼로그가 닫힐 때 폼 상태 리셋 */
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setReason('');
      setDetail('');
    }
  }

  const handleSubmit = async () => {
    if (!reason) return;

    try {
      await reportMutation.mutateAsync({
        reviewId,
        dto: {
          reason,
          ...(reason === ReportReason.OTHER && detail.trim() ? { detail: detail.trim() } : {}),
        },
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        toast.error('You have already reported this review');
        onOpenChange(false);
      } else {
        showErrorToast(error, 'Report submission failed. Please try again.');
      }
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Review</DialogTitle>
          <DialogDescription>
            Please select a reason for reporting this review.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Reason</Label>
            <Select
              value={reason}
              onValueChange={(val) => setReason(val as ReportReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ReportReason).map((r) => (
                  <SelectItem key={r} value={r}>
                    {REPORT_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reason === ReportReason.OTHER && (
            <div className="grid gap-2">
              <Label htmlFor="report-detail">Detail</Label>
              <Textarea
                id="report-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Please provide more detail..."
                rows={3}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={reportMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            data-testid="review-report-submit"
            onClick={handleSubmit}
            disabled={!reason || reportMutation.isPending}
          >
            {reportMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
