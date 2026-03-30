import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ProfilePageContent } from './_components/profile-page-content';

export const metadata: Metadata = {
  title: 'Profile | Hidden Bar',
  description: 'Manage your Hidden Bar profile',
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
