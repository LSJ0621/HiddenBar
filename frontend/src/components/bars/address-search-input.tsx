'use client';

import { useRef, KeyboardEvent } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAddressSearch,
  type AddressSearchResult,
} from '@/hooks/use-address-search';

interface AddressSearchInputProps {
  onSelect: (result: AddressSearchResult) => void;
}

/** 주소 검색 Input + 검색 버튼 + 결과 드롭다운 */
export function AddressSearchInput({ onSelect }: AddressSearchInputProps) {
  const { query, setQuery, results, isLoading, search, select, clear } =
    useAddressSearch(onSelect);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void search();
    }
  };

  const handleSelect = (result: AddressSearchResult) => {
    select(result);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <Input
          data-testid="address-search-input"
          className="flex-1"
          placeholder="Search by address or place name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void search()}
          disabled={isLoading || !query.trim()}
          data-testid="address-search-button"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <ul
          data-testid="address-search-results"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {results.map((result, index) => (
            <li key={index}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleSelect(result)}
                data-testid={`address-search-result-${index}`}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium">{result.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {result.formattedAddress}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
