'use client';

import { Footprints, MapPin, Circle } from 'lucide-react';
import type { DirectionsStep } from '@/types';

interface TransitTimelineProps {
  steps: DirectionsStep[];
}

/**
 * Google Maps 스타일의 대중교통 세로 타임라인 컴포넌트.
 * 노선 색상, 역명, 시간 등을 시각적으로 표시한다.
 */
export function TransitTimeline({ steps }: TransitTimelineProps) {
  const firstTransit = steps.find((s) => s.transitDetails);
  const lastTransit = [...steps].reverse().find((s) => s.transitDetails);

  return (
    <div className="space-y-0">
      {/* Start marker */}
      {firstTransit?.transitDetails && (
        <div className="flex items-center gap-3 pb-1">
          <div className="flex w-6 justify-center">
            <Circle className="size-4 fill-primary text-primary" />
          </div>
          <div className="text-sm">
            <span className="font-medium">My Location</span>
            {firstTransit.transitDetails.departureTime && (
              <span className="ml-2 text-muted-foreground">
                {formatTime(firstTransit.transitDetails.departureTime)}
              </span>
            )}
          </div>
        </div>
      )}

      {steps.map((step, index) => (
        <div key={index}>
          {step.travelMode === 'WALK' ? (
            <WalkStep step={step} />
          ) : step.transitDetails ? (
            <TransitStep step={step} />
          ) : (
            <WalkStep step={step} />
          )}
        </div>
      ))}

      {/* End marker */}
      {lastTransit?.transitDetails && (
        <div className="flex items-center gap-3 pt-1">
          <div className="flex w-6 justify-center">
            <MapPin className="size-4 text-red-500" />
          </div>
          <div className="text-sm">
            <span className="font-medium">Destination</span>
            {lastTransit.transitDetails.arrivalTime && (
              <span className="ml-2 text-muted-foreground">
                {formatTime(lastTransit.transitDetails.arrivalTime)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WalkStep({ step }: { step: DirectionsStep }) {
  return (
    <div className="flex gap-3">
      <div className="flex w-6 flex-col items-center">
        <div className="h-1 w-px border-l-2 border-dashed border-muted-foreground/40" />
        <Footprints className="my-1 size-3.5 shrink-0 text-muted-foreground" />
        <div className="min-h-2 flex-1 border-l-2 border-dashed border-muted-foreground/40" />
      </div>
      <div className="flex items-center py-2 text-sm text-muted-foreground">
        Walk {step.duration.text}
        {step.distance.text && (
          <span className="ml-1">({step.distance.text})</span>
        )}
      </div>
    </div>
  );
}

function TransitStep({ step }: { step: DirectionsStep }) {
  const td = step.transitDetails!;

  return (
    <div className="flex gap-3">
      {/* Colored vertical line */}
      <div className="flex w-6 flex-col items-center">
        <div
          className="w-1 rounded-full"
          style={{ backgroundColor: td.lineColor, minHeight: '100%' }}
        />
      </div>

      <div className="flex-1 space-y-1.5 py-2">
        {/* Departure station + time */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{td.departureStop}</span>
          {td.departureTime && (
            <span className="text-muted-foreground">{formatTime(td.departureTime)}</span>
          )}
        </div>

        {/* Line badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: td.lineColor, color: td.lineTextColor }}
          >
            {td.lineShortName || td.lineName}
          </span>
          {td.lineShortName && td.lineName !== td.lineShortName && (
            <span className="text-xs text-muted-foreground">{td.lineName}</span>
          )}
        </div>

        {/* Stop count */}
        {td.stopCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {td.stopCount} stops
          </p>
        )}

        {/* Arrival station + time */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{td.arrivalStop}</span>
          {td.arrivalTime && (
            <span className="text-muted-foreground">{formatTime(td.arrivalTime)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
