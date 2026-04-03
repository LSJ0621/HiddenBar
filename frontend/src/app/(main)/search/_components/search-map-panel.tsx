'use client';

import { AdvancedMarker, InfoWindow, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { MapView } from '@/components/map/map-view';
import { BarMarker } from '@/components/map/bar-marker';
import { UserLocationDot } from '@/components/map/user-location-dot';
import { SearchFitBounds } from '@/components/map/search-fit-bounds';
import { SelectedBarInfoWindow } from '@/app/(main)/search/_components/selected-bar-info-window';
import type { BarSummary, LatLng } from '@/types';

interface SearchMapPanelProps {
  /** 지도 중심 좌표 (유저 위치 기반) */
  mapCenter: LatLng | undefined;
  /** 현재 활성 탭 */
  tab: string;
  /** 지도 클릭으로 설정된 핀 좌표 (map 탭 전용) */
  mapPin: LatLng | null;
  /** 지도에 표시할 바 목록 */
  displayedBars: BarSummary[];
  /** 현재 InfoWindow에 표시 중인 선택된 바 */
  selectedBar: BarSummary | null;
  /** 바 마커 클릭 시 선택 상태 업데이트 핸들러 */
  onSelectBar: (bar: BarSummary | null) => void;
  /** 지도 클릭 핸들러 */
  onMapClick: (e: MapMouseEvent) => void;
}

/**
 * 검색 페이지의 지도 패널 컴포넌트.
 * GoogleMap, 유저 위치 점, 바 마커, 지도 핀, InfoWindow를 렌더링한다.
 */
export function SearchMapPanel({
  mapCenter,
  tab,
  mapPin,
  displayedBars,
  selectedBar,
  onSelectBar,
  onMapClick,
}: SearchMapPanelProps) {
  return (
    <div className="shrink-0 px-4 pt-4 md:sticky md:top-16 md:z-0 md:h-[calc(100dvh-4rem)] md:w-1/2 md:p-0 lg:w-[55%]">
      <MapView
        center={mapCenter}
        className="h-[200px] overflow-hidden rounded-lg md:h-full md:rounded-none"
        onMapClick={onMapClick}
      >
        {mapCenter && <UserLocationDot position={mapCenter} />}
        {tab === 'map' && mapPin && (
          <AdvancedMarker position={mapPin}>
            <svg
              width="22"
              height="28"
              viewBox="0 0 56 72"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="search-pin-grad" x1="28" y1="0" x2="28" y2="60" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2C2418" />
                  <stop offset="1" stopColor="#1A1610" />
                </linearGradient>
              </defs>
              <path
                d="M28 0C12.536 0 0 12.536 0 28c0 21 28 44 28 44s28-23 28-44C56 12.536 43.464 0 28 0z"
                fill="url(#search-pin-grad)"
              />
              <path
                d="M20 17h16l-6 10h-4l-6-10z"
                fill="none"
                stroke="#E8A849"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <rect x="27" y="27" width="2" height="5" rx="0.8" fill="#E8A849" />
              <rect x="24" y="32" width="8" height="1.5" rx="0.75" fill="#E8A849" />
              <line x1="21" y1="20" x2="35" y2="20" stroke="#E8A849" strokeWidth="1" opacity="0.4" />
            </svg>
          </AdvancedMarker>
        )}
        {displayedBars.map((bar) => (
          <BarMarker
            key={bar.id}
            bar={bar}
            onClick={() => onSelectBar(selectedBar?.id === bar.id ? null : bar)}
          />
        ))}
        {selectedBar && (
          <InfoWindow
            position={{ lat: selectedBar.latitude, lng: selectedBar.longitude }}
            headerDisabled
            pixelOffset={[0, -32]}
          >
            <SelectedBarInfoWindow bar={selectedBar} />
          </InfoWindow>
        )}
        {displayedBars.length > 0 && (
          <SearchFitBounds
            points={displayedBars.map((b) => ({ lat: b.latitude, lng: b.longitude }))}
          />
        )}
      </MapView>
    </div>
  );
}
