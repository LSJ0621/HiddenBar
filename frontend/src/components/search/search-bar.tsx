'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, MapPinned, ListFilter, Check, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { AddressSearchResult } from '@/hooks/use-address-search';
import { useBarNameSuggestions } from '@/hooks/queries/use-search';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import type { BarSummary } from '@/types';

interface SearchBarProps {
  onSearch: (params: {
    name?: string;
    lat?: number;
    lng?: number;
    addressDisplay?: string;
  }) => void;
  defaultName?: string;
  defaultAddressDisplay?: string;
  defaultAddressLat?: number;
  defaultAddressLng?: number;
  tab?: string;
  onTabChange?: (tab: string) => void;
  autoFocus?: boolean;
  /** 지도에서 클릭한 핀 좌표 (map 탭 전용) */
  mapPin?: { lat: number; lng: number } | null;
  /** 지도 핀 위치로 검색 실행 (map 탭 전용) */
  onMapSearch?: () => void;
}

type AddressFieldState = 'idle' | 'results' | 'selected';

interface SelectedAddress {
  display: string;
  lat: number;
  lng: number;
}

// --- 주소 필드 로직 (address 탭, both 탭 공유) ---
function useAddressField(defaults: {
  display: string;
  lat?: number;
  lng?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fieldState, setFieldState] = useState<AddressFieldState>(
    defaults.display && defaults.lat != null && defaults.lng != null
      ? 'selected'
      : 'idle',
  );
  const [query, setQuery] = useState(
    defaults.display && defaults.lat != null && defaults.lng != null
      ? defaults.display
      : '',
  );
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SelectedAddress | null>(
    defaults.display && defaults.lat != null && defaults.lng != null
      ? { display: defaults.display, lat: defaults.lat, lng: defaults.lng }
      : null,
  );
  const [highlight, setHighlight] = useState(-1);
  const [isActive, setIsActive] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get<{ results: AddressSearchResult[] }>(
        API_ENDPOINTS.MAPS.ADDRESS_SEARCH,
        { params: { query: q.trim(), language: 'en' } },
      );
      setResults(data.results);
      setFieldState('results');
      setHighlight(-1);
    } catch {
      setResults([]);
      setFieldState('results');
    } finally {
      setLoading(false);
    }
  }, []);

  const select = useCallback((result: AddressSearchResult) => {
    const addr: SelectedAddress = {
      display: result.displayName,
      lat: result.latitude,
      lng: result.longitude,
    };
    setSelected(addr);
    setQuery(result.displayName);
    setFieldState('selected');
    setResults([]);
    setIsActive(false);
    return addr;
  }, []);

  const clear = useCallback(() => {
    setSelected(null);
    setQuery('');
    setFieldState('idle');
    setResults([]);
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setFieldState('idle');
    setResults([]);
  }, []);

  return {
    inputRef,
    fieldState,
    query,
    results,
    loading,
    selected,
    highlight,
    setHighlight,
    isActive,
    setIsActive,
    search,
    select,
    clear,
    handleChange,
  };
}

// --- 이름 필드 로직 (name 탭, both 탭 공유) ---
function useNameField(defaultName: string) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultName);
  const [debouncedName, setDebouncedName] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const [isActive, setIsActive] = useState(false);

  const updateDebounced = useDebouncedCallback((val: string) => {
    setDebouncedName(val);
  }, 300);

  const { data: suggestions } = useBarNameSuggestions(debouncedName);
  const items = useMemo(() => suggestions?.items ?? [], [suggestions?.items]);

  const handleChange = useCallback(
    (val: string) => {
      setValue(val);
      setHighlight(-1);
      updateDebounced(val);
    },
    [updateDebounced],
  );

  return {
    inputRef,
    value,
    setValue,
    items,
    highlight,
    setHighlight,
    isActive,
    setIsActive,
    handleChange,
  };
}

// --- 주소 입력 UI 컴포넌트 ---
function AddressInput({
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

// --- 이름 입력 UI 컴포넌트 ---
function NameInput({
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

/** 4탭 검색바: 주소 / 이름 / 주소+이름 / 지도 핀 */
export function SearchBar({
  onSearch,
  defaultName = '',
  defaultAddressDisplay = '',
  defaultAddressLat,
  defaultAddressLng,
  tab = 'address',
  onTabChange,
  autoFocus,
  mapPin,
  onMapSearch,
}: SearchBarProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // 탭별 독립 상태
  const addressField = useAddressField({
    display: defaultAddressDisplay,
    lat: defaultAddressLat,
    lng: defaultAddressLng,
  });
  const nameField = useNameField(defaultName);

  // both 탭 전용 상태
  const bothAddressField = useAddressField({
    display: defaultAddressDisplay,
    lat: defaultAddressLat,
    lng: defaultAddressLng,
  });
  const bothNameField = useNameField(defaultName);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        addressField.setIsActive(false);
        nameField.setIsActive(false);
        bothAddressField.setIsActive(false);
        bothNameField.setIsActive(false);
        // 주소 결과 상태에서 외부 클릭 시 idle로 복귀
        if (addressField.fieldState === 'results') {
          addressField.handleChange(addressField.query);
        }
        if (bothAddressField.fieldState === 'results') {
          bothAddressField.handleChange(bothAddressField.query);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addressField, nameField, bothAddressField, bothNameField]);

  /** 바 이름 드롭다운 항목 선택 → 상세 페이지 이동 */
  const handleBarSelect = useCallback(
    (bar: BarSummary) => {
      router.push(`/bars/${bar.id}`);
    },
    [router],
  );

  // --- 탭별 검색 핸들러 ---
  const handleAddressSearch = useCallback(
    (addr: SelectedAddress) => {
      onSearch({
        lat: addr.lat,
        lng: addr.lng,
        addressDisplay: addr.display,
      });
    },
    [onSearch],
  );

  const handleAddressClear = useCallback(() => {
    onSearch({});
  }, [onSearch]);

  const handleNameSearch = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (trimmed) {
        onSearch({ name: trimmed });
      }
    },
    [onSearch],
  );

  const handleBothSearch = useCallback(
    (nameOverride?: string) => {
      const addr = bothAddressField.selected;
      const name = (nameOverride ?? bothNameField.value).trim();
      if (!addr) return;
      onSearch({
        lat: addr.lat,
        lng: addr.lng,
        addressDisplay: addr.display,
        ...(name ? { name } : {}),
      });
    },
    [bothAddressField.selected, bothNameField.value, onSearch],
  );

  return (
    <div ref={containerRef}>
      <Tabs value={tab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="address" data-tab="address" className="flex-1 gap-1">
            <MapPin className="size-4" />
            <span className="hidden sm:inline">Address</span>
          </TabsTrigger>
          <TabsTrigger value="name" data-tab="name" className="flex-1 gap-1">
            <Search className="size-4" />
            <span className="hidden sm:inline">Name</span>
          </TabsTrigger>
          <TabsTrigger value="both" data-tab="both" className="flex-1 gap-1">
            <ListFilter className="size-4" />
            <span className="hidden sm:inline">Both</span>
          </TabsTrigger>
          <TabsTrigger value="map" data-tab="map" className="flex-1 gap-1">
            <MapPinned className="size-4" />
            <span className="hidden sm:inline">Map Pin</span>
          </TabsTrigger>
        </TabsList>

        {/* 탭 1: 주소 검색 */}
        <TabsContent value="address" className="pt-3">
          <AddressInput
            field={addressField}
            onSelect={handleAddressSearch}
            onClear={handleAddressClear}
            containerRef={containerRef}
          />
        </TabsContent>

        {/* 탭 2: 이름 검색 */}
        <TabsContent value="name" className="pt-3">
          <NameInput
            field={nameField}
            onSearch={handleNameSearch}
            onBarSelect={handleBarSelect}
            autoFocus={autoFocus}
          />
        </TabsContent>

        {/* 탭 3: 주소 + 이름 */}
        <TabsContent value="both" className="space-y-2 pt-3">
          <AddressInput
            field={bothAddressField}
            onSelect={() => {
              /* 주소 선택만, 검색은 아래 버튼으로 */
            }}
            onClear={() => {
              /* both 탭에서 클리어 시 아무것도 하지 않음 */
            }}
            containerRef={containerRef}
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Search className="size-4 text-muted-foreground" />
              </div>
              <Input
                ref={bothNameField.inputRef}
                value={bothNameField.value}
                onChange={(e) => bothNameField.handleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBothSearch();
                  }
                }}
                onFocus={() => bothNameField.setIsActive(true)}
                placeholder={
                  bothAddressField.fieldState === 'selected'
                    ? 'Filter by bar name...'
                    : 'Select address first...'
                }
                aria-label="Filter by bar name"
                disabled={bothAddressField.fieldState !== 'selected'}
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => handleBothSearch()}
              disabled={bothAddressField.fieldState !== 'selected'}
              size="icon"
              aria-label="Search"
            >
              <Search />
            </Button>
          </div>
        </TabsContent>

        {/* 탭 4: 지도 핀 */}
        <TabsContent value="map" className="pt-3">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-muted-foreground">
              Tap on the map to select where you want to search
            </p>
            <Button
              id="search-here-button"
              onClick={onMapSearch}
              disabled={!mapPin}
              className="ml-auto"
            >
              Search here
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
