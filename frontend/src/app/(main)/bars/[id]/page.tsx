import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import api from '@/lib/api';
import type { BarDetail } from '@/types';
import { GoogleMapsProvider } from '@/components/map/google-maps-provider';
import { LocationProvider } from '@/providers/location-provider';
import { BarDetailView } from './_components/bar-detail-view';

interface BarDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Fetch bar data for metadata and validation */
async function getBar(id: number): Promise<BarDetail | null> {
  try {
    const { data } = await api.get<BarDetail>(`/bars/${id}`);
    return data;
  } catch {
    return null;
  }
}

/** Generate dynamic metadata for SEO */
export async function generateMetadata({ params }: BarDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const bar = await getBar(Number(id));

  if (!bar) {
    return { title: 'Bar Not Found' };
  }

  return {
    title: `${bar.name} | Hidden Bar`,
    description: bar.description ?? `${bar.name} - ${bar.city}, ${bar.country}`,
  };
}

/** Bar detail page (server component) */
export default async function BarDetailPage({ params }: BarDetailPageProps) {
  const { id } = await params;
  const barId = Number(id);

  if (isNaN(barId)) {
    notFound();
  }

  return (
    <LocationProvider>
      <GoogleMapsProvider>
        <BarDetailView barId={barId} />
      </GoogleMapsProvider>
    </LocationProvider>
  );
}
