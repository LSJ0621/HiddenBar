'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth';

const AUTH_ROUTES = ['/login', '/signup', '/oauth'];

/** Restores auth state on mount (non-blocking) */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { hydrate, isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (hasHydrated.current) return;
    if (AUTH_ROUTES.some(route => pathname.startsWith(route))) return;
    hasHydrated.current = true;
    hydrate();
  }, [pathname, hydrate, isAuthenticated]);

  return <>{children}</>;
}
