import type { Metadata } from 'next';
import { GoogleMapsProvider } from '@/components/map/google-maps-provider';
import { EditBarContent } from './_components/edit-bar-content';

export const metadata: Metadata = {
  title: 'Edit Bar | HiddenBar',
};

interface EditBarPageProps {
  params: Promise<{ id: string }>;
}

/** Bar edit page (server component wrapper) */
export default async function EditBarPage({ params }: EditBarPageProps) {
  const { id } = await params;
  return (
    <GoogleMapsProvider>
      <EditBarContent barId={Number(id)} />
    </GoogleMapsProvider>
  );
}
