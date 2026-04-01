import { Suspense } from 'react';
import type { Metadata } from 'next';
import { GuidePageContent } from './_components/guide-page-content';

export const metadata: Metadata = {
  title: 'User Guide | Hidden Bar',
  description: 'Hidden Bar user guide — from search to directions',
};

export default function GuidePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4">
          <p className="text-muted-foreground">Loading guide...</p>
        </div>
      }
    >
      <GuidePageContent />
    </Suspense>
  );
}
