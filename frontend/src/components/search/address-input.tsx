'use client';

import { useCallback } from 'react';
import { Search, MapPin, Check, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AddressSearchResult } from '@/hooks/use-address-search';
import type { useAddressField, SelectedAddress } from '@/components/search/hooks/use-address-field';

/**
 * 주소 검색 입력 필드와 결과 드롭다운을 렌더링하는 UI 컴포넌트.
 * useAddressField 훅과 함께 사용된다.
 */
export function AddressInput({
  field,
  onSelect,
  onClear,
  containerRef,
}: {
  field: ReturnType<typeof useAddressField>;
  onSelect: (addr: SelectedAddress) => void;
  onClear: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (field.fieldState === 'results' && field.results.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            field.setHighlight((prev) =>
              prev < field.results.length - 1 ? prev + 1 : 0,
            );
            return;
          case 'ArrowUp':
            e.preventDefault();
            field.setHighlight((prev) =>
              prev > 0 ? prev - 1 : field.results.length - 1,
            );
            return;
          case 'Enter':
            e.preventDefault();
            if (field.highlight >= 0 && field.highlight < field.results.length) {
              const addr = field.select(field.results[field.highlight]);
              onSelect(addr);
            }
            return;
          case 'Escape':
            e.preventDefault();
            field.setIsActive(false);
            return;
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        field.search(field.query);
      }
    },
    [field, onSelect],
  );

  const handleResultClick = useCallback(
    (result: AddressSearchResult) => {
      const addr = field.select(result);
      onSelect(addr);
    },
    [field, onSelect],
  );

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {field.fieldState === 'selected' ? (
              <Check className="size-4 text-primary" />
            ) : (
              <MapPin className="size-4 text-muted-foreground" />
            )}
          </div>
          <Input
            ref={field.inputRef}
            data-testid="address-search-input"
            value={field.query}
            onChange={(e) => field.handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (field.fieldState !== 'selected') {
                field.setIsActive(true);
              }
            }}
            placeholder="Search address..."
            aria-label="Search address"
            readOnly={field.fieldState === 'selected'}
            className={cn(
              'pl-9 pr-9',
              field.fieldState === 'selected' &&
                'cursor-default border-primary/20 bg-primary/5 text-foreground',
            )}
            role="combobox"
            aria-expanded={field.fieldState === 'results' && field.isActive}
            aria-haspopup="listbox"
          />
          {field.fieldState === 'selected' && (
            <button
              type="button"
              onClick={() => {
                field.clear();
                onClear();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear address"
            >
              <X className="size-4" />
            </button>
          )}
          {field.loading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          )}
        </div>
        <Button
          onClick={() => field.search(field.query)}
          disabled={field.fieldState === 'selected' || !field.query.trim()}
          size="icon"
          aria-label="Search address"
        >
          <Search />
        </Button>
      </div>

      {field.fieldState === 'results' && field.isActive && (
        <ul
          role="listbox"
          data-testid="address-dropdown"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
        >
          {field.results.length === 0 ? (
            <li className="px-3 py-3 text-center text-sm text-muted-foreground">
              No address found
            </li>
          ) : (
            <>
              {field.results.map((result, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === field.highlight}
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2 text-left text-sm',
                      idx === field.highlight
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50',
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleResultClick(result);
                    }}
                    onMouseEnter={() => field.setHighlight(idx)}
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
              <li className="border-t px-3 py-1.5 text-center text-xs text-muted-foreground">
                Select an address from the results
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}
