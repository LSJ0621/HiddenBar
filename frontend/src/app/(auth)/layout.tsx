import type { Metadata } from 'next';
import { Wine } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hidden Bar',
  description: 'Discover hidden bars in your city',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark">
      <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-8">
        {/* Ambient glow layers */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(180,130,60,0.08)_0%,_transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_50%)]" />

        {/* Logo */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative mb-8 flex flex-col items-center gap-2">
          <Wine className="size-10 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Hidden Bar
          </h1>
          <p className="text-sm text-muted-foreground">
            Discover the city&apos;s best-kept secrets
          </p>
        </div>

        {/* Auth card */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative w-full max-w-sm delay-150">
          {children}
        </div>
      </div>
    </div>
  );
}
