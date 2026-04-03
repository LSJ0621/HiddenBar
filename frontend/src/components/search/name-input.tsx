'use client';

import { useCallback } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BarSummary } from '@/types';
import type { useNameField } from '@/components/search/hooks/use-name-field';

/**
 * 바 이름 검색 입력 필드와 자동완성 드롭다운을 렌더링하는 UI 컴포넌트.
 * useNameField 훅과 함께 사용된다.
 */
export function NameInput({
  field,
  onSearch,
  onBarSelect,
  autoFocus,
  showButton = true,
}: {
  field: ReturnType<typeof useNameField>;
  onSearch: (name: string) => void;
  onBarSelect: (bar: BarSummary) => void;
  autoFocus?: boolean;
  showButton?: boolean;
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (field.isActive && field.items.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            field.setHighlight((prev) =>
              prev < field.items.length - 1 ? prev + 1 : 0,
            );
            return;
          case 'ArrowUp':
            e.preventDefault();
            field.setHighlight((prev) =>
              prev > 0 ? prev - 1 : field.items.length - 1,
            );
            return;
          case 'Enter':
            e.preventDefault();
            if (field.highlight >= 0 && field.highlight < field.items.length) {
              onBarSelect(field.items[field.highlight]);
            } else {
              onSearch(field.value);
              field.setIsActive(false);
            }
            return;
          case 'Escape':
            e.preventDefault();
            field.setIsActive(false);
            field.setHighlight(-1);
            return;
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        onSearch(field.value);
        field.setIsActive(false);
      }
    },
    [field, onSearch, onBarSelect],
  );

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <Search className="size-4 text-muted-foreground" />
          </div>
          <Input
            ref={field.inputRef}
            data-testid="search-input"
            value={field.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => field.setIsActive(true)}
            placeholder="Search by bar name..."
            aria-label="Search by bar name"
            autoFocus={autoFocus}
            className="pl-9"
            role="combobox"
            aria-expanded={field.isActive && field.items.length > 0}
            aria-haspopup="listbox"
            aria-autocomplete="list"
          />
        </div>
        {showButton && (
          <Button
            data-testid="search-button"
            onClick={() => {
              onSearch(field.value);
              field.setIsActive(false);
            }}
            size="icon"
            aria-label="Search"
          >
            <Search />
          </Button>
        )}
      </div>

      {field.isActive && field.items.length > 0 && (
        <ul
          role="listbox"
          data-testid="bar-name-dropdown"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md"
        >
          {field.items.map((bar, idx) => (
            <li
              key={bar.id}
              role="option"
              aria-selected={idx === field.highlight}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm',
                idx === field.highlight
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onBarSelect(bar);
              }}
              onMouseEnter={() => field.setHighlight(idx)}
            >
              <span className="font-medium">{bar.name}</span>
              {bar.city && (
                <span className="ml-1 text-muted-foreground">({bar.city})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
