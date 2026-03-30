import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MyBarsContent } from './_components/my-bars-content';

export const metadata: Metadata = {
  title: 'My Bars | HiddenBar',
};

/** My bars listing page */
export default function MyBarsPage() {
  return (
    <Suspense>
      <MyBarsContent />
    </Suspense>
  );
}
