'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ApproveRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  variant?: 'default' | 'destructive';
  requireReason?: boolean;
  minReasonLength?: number;
  onConfirm: (reason: string) => Promise<void>;
}

/** Shared dialog for approve/reject/delete actions with optional reason */
export function ApproveRejectDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  variant = 'default',
  requireReason = false,
  minReasonLength = 10,
  onConfirm,
}: ApproveRejectDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (requireReason && reason.trim().length < minReasonLength) {
      setError(`Please enter at least ${minReasonLength} characters for the reason`);
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason('');
      setError('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="reason">
            {requireReason ? 'Reason (required)' : 'Reason (optional)'}
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason..."
            rows={3}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
