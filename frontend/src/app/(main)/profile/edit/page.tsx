import { Suspense } from 'react';
import { ProfileEditContent } from './_components/profile-edit-content';

export default function ProfileEditPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4">
          <p className="text-muted-foreground">Loading profile editor...</p>
        </div>
      }
    >
      <ProfileEditContent />
    </Suspense>
  );
}
