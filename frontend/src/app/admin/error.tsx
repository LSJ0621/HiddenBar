'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      data-testid="admin-error"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"
    >
      <AlertCircle className="size-12 text-destructive" />
      <h2 className="text-xl font-semibold">Admin Page Error</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <div className="flex gap-2">
        <Button
          data-testid="admin-error-retry"
          variant="outline"
          onClick={reset}
        >
          <RefreshCw className="mr-2 size-4" />
          Retry
        </Button>
        <Button asChild>
          <Link href="/admin">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
