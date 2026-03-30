'use client';

import { AdvancedMarker } from '@vis.gl/react-google-maps';

/** 지도 위 유저 현재 위치를 파란 점으로 표시 */
export function UserLocationDot({
  position,
}: {
  position: { lat: number; lng: number };
}) {
  return (
    <AdvancedMarker position={position} title="My Location">
      <div className="relative flex items-center justify-center">
        <span className="absolute size-6 animate-ping rounded-full bg-blue-400/30" />
        <span className="relative size-3 rounded-full border-2 border-white bg-blue-500 shadow-md" />
      </div>
    </AdvancedMarker>
  );
}
