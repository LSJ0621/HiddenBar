'use client';

import { AdvancedMarker } from '@vis.gl/react-google-maps';

interface BarMarkerProps {
  bar: { id: number; name: string; latitude: number; longitude: number };
  isHighlighted?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/** 다크 바디 + 앰버 칵테일 핀 마커 */
export function BarMarker({ bar, onClick, onMouseEnter, onMouseLeave }: BarMarkerProps) {
  return (
    <AdvancedMarker
      position={{ lat: bar.latitude, lng: bar.longitude }}
      title={bar.name}
      onClick={onClick}
    >
      <div
        data-testid={`bar-marker-${bar.id}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <svg
          width="22"
          height="28"
          viewBox="0 0 56 72"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`pin-grad-${bar.id}`} x1="28" y1="0" x2="28" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2C2418" />
              <stop offset="1" stopColor="#1A1610" />
            </linearGradient>
          </defs>
          <path
            d="M28 0C12.536 0 0 12.536 0 28c0 21 28 44 28 44s28-23 28-44C56 12.536 43.464 0 28 0z"
            fill={`url(#pin-grad-${bar.id})`}
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
      </div>
    </AdvancedMarker>
  );
}
