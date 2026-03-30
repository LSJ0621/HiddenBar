import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ReviewReportsTable } from './_components/review-reports-table';

export const dynamic = 'force-dynamic';

export default function AdminReviewReportsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><Skeleton className="h-96 w-full" /></div>}>
      <ReviewReportsTable />
    </Suspense>
  );
}
