import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { UserManagementContent } from './_components/user-management-content';

export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><Skeleton className="h-96 w-full" /></div>}>
      <UserManagementContent />
    </Suspense>
  );
}
