'use client';

import axios from 'axios';
import { Loader2, AlertCircle } from 'lucide-react';
import type { DirectionsRoute } from '@/types';
import { TravelMode } from '@/types';
import { TransitTimeline } from '@/components/map/transit-timeline';
import { sanitizeHtml } from '@/lib/sanitize';

interface DirectionsInfoProps {
  route: DirectionsRoute | undefined;
  isLoading: boolean;
  error: Error | null;
  hasOrigin: boolean;
  mode?: TravelMode;
}

/** Display component for directions info: distance, duration, and step-by-step instructions */
export function DirectionsInfo({ route, isLoading, error, hasOrigin, mode }: DirectionsInfoProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    const is404 = axios.isAxiosError(error) && error.response?.status === 404;
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="size-4" />
        <p>
          {is404
            ? 'No route found for this travel mode'
            : 'An error occurred while fetching directions'}
        </p>
      </div>
    );
  }

  if (!hasOrigin) {
    return (
      <p className="text-sm text-muted-foreground">
        Allow location access to get directions
      </p>
    );
  }

  if (!route) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="size-4" />
        <p>No route found</p>
      </div>
    );
  }

  const hasTransitDetails =
    mode === TravelMode.TRANSIT &&
    route.steps.some((step) => step.transitDetails);

  return (
    <>
      <div className="flex items-center gap-4 text-sm">
        <span data-testid="directions-distance" className="font-medium">
          {route.distance.text}
        </span>
        <span data-testid="directions-duration" className="font-medium">
          {route.duration.text}
        </span>
      </div>

      {hasTransitDetails ? (
        <TransitTimeline steps={route.steps} />
      ) : (
        <ol className="space-y-2">
          {route.steps.map((step, index) => (
            <li key={index} className="flex gap-2 text-sm">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {index + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.instruction) }} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
