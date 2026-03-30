'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import type { Control } from 'react-hook-form';
import { useWatch, useFormContext } from 'react-hook-form';
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { MapView } from '@/components/map/map-view';
import { AddressSearchInput } from '@/components/bars/address-search-input';
import type { AddressSearchResult } from '@/hooks/use-address-search';

interface BarFormStepLocationProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

/** Internal component that uses useMap() to control map pan/zoom */
function MapController({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  const prevTarget = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!map || !target) return;
    if (
      prevTarget.current &&
      prevTarget.current.lat === target.lat &&
      prevTarget.current.lng === target.lng
    ) return;

    prevTarget.current = target;
    map.panTo(target);
    map.setZoom(17);
  }, [map, target]);

  return null;
}

/** Step 2: Address search, city, country, map click for coordinates, phone, website */
export function BarFormStepLocation({ control }: BarFormStepLocationProps) {
  const { setValue } = useFormContext();
  const latitude = useWatch({ control, name: 'latitude' });
  const longitude = useWatch({ control, name: 'longitude' });
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number } | null>(null);

  const hasCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  const handleAddressSelect = useCallback(
    (result: AddressSearchResult) => {
      setValue('address', result.formattedAddress, { shouldValidate: true });
      setValue('city', result.city, { shouldValidate: true });
      setValue('country', result.country, { shouldValidate: true });
      setValue('latitude', result.latitude, { shouldValidate: true });
      setValue('longitude', result.longitude, { shouldValidate: true });

      setPanTarget({
        lat: result.latitude,
        lng: result.longitude,
      });
    },
    [setValue],
  );

  return (
    <div data-testid="bar-form-step-2" className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Address Search</label>
        <AddressSearchInput onSelect={handleAddressSelect} />
      </div>

      <FormField
        control={control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address *</FormLabel>
            <FormControl>
              <Input placeholder="Enter address" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City *</FormLabel>
              <FormControl>
                <Input placeholder="City" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country *</FormLabel>
              <FormControl>
                <Input placeholder="Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <MapView
        className="h-[250px] min-h-0"
        center={hasCoords ? { lat: latitude, lng: longitude } : undefined}
        zoom={hasCoords ? 16 : undefined}
        onMapClick={(e) => {
          const latLng = e.detail.latLng;
          if (latLng) {
            setValue('latitude', latLng.lat, { shouldValidate: true });
            setValue('longitude', latLng.lng, { shouldValidate: true });
          }
        }}
      >
        <MapController target={panTarget} />
        {hasCoords && (
          <AdvancedMarker position={{ lat: latitude, lng: longitude }} />
        )}
      </MapView>
      <p className="text-xs text-muted-foreground">
        Click on the map to set the exact location
      </p>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="02-1234-5678" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="https://" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
