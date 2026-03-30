import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditLogContent } from './_components/audit-log-content';

export const dynamic = 'force-dynamic';

export default function AdminActionsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><Skeleton className="h-96 w-full" /></div>}>
      <AuditLogContent />
    </Suspense>
  );
}
