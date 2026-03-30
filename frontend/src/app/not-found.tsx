import Link from 'next/link';
import { Wine, Home, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div
      data-testid="not-found"
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <Wine className="size-16 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <p className="text-lg text-muted-foreground">
          Page not found
        </p>
      </div>
      <div className="flex gap-2">
        <Button data-testid="not-found-home" asChild>
          <Link href="/">
            <Home className="mr-2 size-4" />
            Go Home
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/search">
            <Search className="mr-2 size-4" />
            Search
          </Link>
        </Button>
      </div>
    </div>
  );
}
