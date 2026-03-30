import type { Metadata } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';

export const metadata: Metadata = {
  title: 'Hidden Bar — Discover Hidden Bars Around the World',
  description: 'Find and explore unique hidden bars near you with reviews, photos, menus, and directions',
};

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <NuqsAdapter>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 pb-16 lg:pb-0">{children}</main>
        <Footer />
        <BottomTabBar />
      </div>
    </NuqsAdapter>
  );
}
