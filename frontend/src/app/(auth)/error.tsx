'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AuthError({
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
    <Card data-testid="auth-error" className="w-full">
      <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <h2 className="text-lg font-semibold">An error occurred</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <div className="flex gap-2">
          <Button
            data-testid="auth-error-retry"
            variant="outline"
            onClick={reset}
          >
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
          <Button asChild>
            <Link href="/login">Go to Log In</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
