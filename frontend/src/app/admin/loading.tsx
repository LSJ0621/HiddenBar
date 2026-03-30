import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div data-testid="admin-loading" className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl border-l-2 border-l-primary/20" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border/50">
        <Skeleton className="h-10 w-full bg-muted/30" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
