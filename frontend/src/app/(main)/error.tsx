'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function MainError({
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
      data-testid="main-error"
      className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"
    >
      <AlertCircle className="size-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <div className="flex gap-2">
        <Button
          data-testid="main-error-retry"
          variant="outline"
          onClick={reset}
        >
          <RefreshCw className="mr-2 size-4" />
          Try Again
        </Button>
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 size-4" />
            Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
