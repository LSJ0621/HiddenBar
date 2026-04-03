'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, MapPinned, ListFilter } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { BarSummary, LatLng } from '@/types';
import { useAddressField } from '@/components/search/hooks/use-address-field';
import { useNameField } from '@/components/search/hooks/use-name-field';
import { AddressInput } from '@/components/search/address-input';
import { NameInput } from '@/components/search/name-input';

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
  mapPin?: LatLng | null;
  /** 지도 핀 위치로 검색 실행 (map 탭 전용) */
  onMapSearch?: () => void;
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
    (addr: { display: string; lat: number; lng: number }) => {
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
