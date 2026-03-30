import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BookmarkPageContent } from './_components/bookmark-page-content';

export const metadata: Metadata = {
  title: 'Bookmarks | Hidden Bar',
  description: 'Your saved hidden bars collection',
};

export default function BookmarksPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4">
          <p className="text-muted-foreground">Loading bookmarks...</p>
        </div>
      }
    >
      <BookmarkPageContent />
    </Suspense>
  );
}
