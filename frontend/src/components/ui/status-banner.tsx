import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type BannerStatus = 'PENDING' | 'REJECTED';

interface StatusBannerProps {
  status: BannerStatus;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

const STATUS_CONFIG: Record<BannerStatus, { icon: typeof Clock; containerClass: string }> = {
  PENDING: {
    icon: Clock,
    containerClass: 'bg-warning/15 border-warning/30 text-warning-foreground',
  },
  REJECTED: {
    icon: AlertTriangle,
    containerClass: 'bg-destructive/10 border-destructive/20 text-destructive',
  },
};

/** Status banner for PENDING or REJECTED states */
export function StatusBanner({
  status,
  message,
  action,
  className,
}: StatusBannerProps) {
  const { icon: Icon, containerClass } = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-4',
        containerClass,
        className,
      )}
      role="alert"
    >
      <Icon className="size-5 shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
