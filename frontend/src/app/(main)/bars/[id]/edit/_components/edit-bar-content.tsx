'use client';

import { Loader2 } from 'lucide-react';
import { DayOfWeek } from '@/types';

import { useBarDetail } from '@/hooks/queries/use-bars';
import { useAuthStore } from '@/hooks/use-auth';
import { BarForm } from '@/components/bars/bar-form';
import type { CreateBarFormValues } from '@/lib/validations/bar-schema';

interface EditBarContentProps {
  barId: number;
}

const DEFAULT_OPERATING_HOURS = Object.values(DayOfWeek).map((day) => ({
  dayOfWeek: day,
  openTime: '09:00',
  closeTime: '22:00',
  isClosed: false,
}));

/** Client component that loads bar data and renders the edit form */
export function EditBarContent({ barId }: EditBarContentProps) {
  const { data: bar, isLoading } = useBarDetail(barId);
  const { user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bar) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">Bar not found</p>
      </div>
    );
  }

  if (bar.owner.id !== user?.id) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">You do not have permission to edit</p>
      </div>
    );
  }

  const defaultValues: Partial<CreateBarFormValues> = {
    name: bar.name,
    description: bar.description ?? '',
    address: bar.address,
    city: bar.city,
    country: bar.country,
    latitude: bar.latitude,
    longitude: bar.longitude,
    phone: bar.phone ?? '',
    website: bar.website ?? '',
    menuItems: bar.menuItems.map((m) => ({
      name: m.name,
      description: m.description ?? '',
      price: m.price,
      currency: 'USD' as const,
    })),
    operatingHours: DEFAULT_OPERATING_HOURS.map((defaultHour) => {
      const existing = bar.operatingHours.find((oh) => oh.dayOfWeek === defaultHour.dayOfWeek);
      return existing
        ? {
            dayOfWeek: existing.dayOfWeek,
            openTime: existing.openTime,
            closeTime: existing.closeTime,
            isClosed: existing.isClosed,
          }
        : defaultHour;
    }),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="font-display text-2xl font-bold tracking-tight">Edit Bar</h1>
      <BarForm
        mode="edit"
        defaultValues={defaultValues}
        barId={barId}
        existingPhotos={bar.photos}
      />
    </div>
  );
}
