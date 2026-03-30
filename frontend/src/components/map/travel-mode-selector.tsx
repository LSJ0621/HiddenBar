'use client';

import { TravelMode } from '@/types';
import { TRAVEL_MODE_LABELS } from '@/lib/constants';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface TravelModeSelectorProps {
  mode: TravelMode;
  onChange: (mode: TravelMode) => void;
}

/** Toggle group for selecting travel mode (walking, transit, driving) */
export function TravelModeSelector({ mode, onChange }: TravelModeSelectorProps) {
  const handleValueChange = (value: string) => {
    if (value) {
      onChange(value as TravelMode);
    }
  };

  return (
    <ToggleGroup type="single" value={mode} onValueChange={handleValueChange} variant="outline">
      {Object.values(TravelMode).map((travelMode) => (
        <ToggleGroupItem
          key={travelMode}
          value={travelMode}
          data-testid={`travel-mode-${travelMode.toLowerCase()}`}
          aria-label={TRAVEL_MODE_LABELS[travelMode]}
        >
          {TRAVEL_MODE_LABELS[travelMode]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
