'use client';

import { SearchX } from 'lucide-react';
import { SearchSortBy } from '@my-project/shared';
import { Button } from '@/components/ui/button';
import { BarCard } from '@/components/bars/bar-card';
import { useSearchBars } from '@/hooks/queries/use-search';

interface SearchEmptyStateProps {
  query?: string;
  onResetFilters?: () => void;
}

/** Empty state message shown when search returns no results */
export function SearchEmptyState({ query, onResetFilters }: SearchEmptyStateProps) {
  const { data: popularData } = useSearchBars({
    sortBy: SearchSortBy.BOOKMARKS,
    limit: 3,
  });

  const popularBars = popularData?.items ?? [];

  return (
    <div
      data-testid="search-empty-state"
      className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground"
    >
      <SearchX className="size-12" />
      <p className="text-lg font-medium">
        {query
          ? `No results found for '${query}'`
          : 'No results found'}
      </p>
      {onResetFilters && (
        <Button variant="outline" onClick={onResetFilters}>
          Reset Filters
        </Button>
      )}

      {popularBars.length > 0 && (
        <div className="mt-8 w-full max-w-2xl">
          <p className="mb-4 text-center text-sm font-medium text-foreground">
            Popular Bar Recommendations
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {popularBars.map((bar) => (
              <BarCard key={bar.id} bar={bar} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
