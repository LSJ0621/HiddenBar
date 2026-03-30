'use client';

import { Badge } from '@/components/ui/badge';
import type { BarStatus } from '@/types';
import { BAR_STATUS_LABELS, BAR_STATUS_VARIANTS } from '@/lib/constants';

interface BarStatusBadgeProps {
  status: BarStatus;
}

/** Color-coded badge for bar status */
export function BarStatusBadge({ status }: BarStatusBadgeProps) {
  return (
    <Badge variant={BAR_STATUS_VARIANTS[status]}>
      {BAR_STATUS_LABELS[status]}
    </Badge>
  );
}
