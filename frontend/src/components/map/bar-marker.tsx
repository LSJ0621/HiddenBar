'use client';

import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface BarMarkerProps {
  bar: { id: number; name: string; latitude: number; longitude: number };
  isHighlighted?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/** Map marker for a bar location */
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
        <Pin />
      </div>
    </AdvancedMarker>
  );
}
