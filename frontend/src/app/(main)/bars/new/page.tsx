import type { Metadata } from 'next';
import { BarForm } from '@/components/bars/bar-form';
import { GoogleMapsProvider } from '@/components/map/google-maps-provider';

export const metadata: Metadata = {
  title: 'Register New Bar | HiddenBar',
};

/** New bar registration page */
export default function NewBarPage() {
  return (
    <GoogleMapsProvider>
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Register New Bar</h1>
        <BarForm mode="create" />
      </div>
    </GoogleMapsProvider>
  );
}
