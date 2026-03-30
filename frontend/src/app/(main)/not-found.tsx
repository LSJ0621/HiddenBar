import Link from 'next/link';
import { Home, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function MainNotFound() {
  return (
    <div
      data-testid="main-not-found"
      className="container flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center"
    >
      <div className="space-y-2">
        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <p className="text-lg text-muted-foreground">
          Page not found
        </p>
      </div>
      <div className="flex gap-2">
        <Button data-testid="main-not-found-home" asChild>
          <Link href="/">
            <Home className="mr-2 size-4" />
            Home
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
