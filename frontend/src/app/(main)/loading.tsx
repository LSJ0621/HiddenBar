import { Skeleton } from '@/components/ui/skeleton';
import { BarCardSkeleton } from '@/components/bars/bar-card';
import { SKELETON_COUNT } from '@/lib/constants';

export default function MainLoading() {
  return (
    <div data-testid="main-loading" className="container space-y-6 py-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <BarCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
