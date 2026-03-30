'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Navigation, User } from 'lucide-react';
import { isLoggedIn } from '@/lib/token';
import { cn } from '@/lib/utils';

interface Tab {
  href: string;
  label: string;
  icon: typeof Home;
  requiresAuth?: boolean;
}

const TABS: Tab[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/directions', label: 'Directions', icon: Navigation },
  { href: '/profile', label: 'MY', icon: User, requiresAuth: true },
];

/** Mobile bottom tab bar — fixed, visible only on mobile (md:hidden) */
export function BottomTabBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isActive = (href: string) => {
    if (href === '/search') {
      return pathname === '/search';
    }
    if (href === '/profile') {
      return pathname.startsWith('/profile');
    }
    return pathname === href;
  };

  const getHref = (tab: Tab) => {
    if (tab.requiresAuth && mounted && !isLoggedIn()) {
      return '/login?redirect=/profile';
    }
    return tab.href;
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-safe backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          const classes = cn(
            'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
            active ? 'text-primary' : 'text-muted-foreground',
          );

          return (
            <Link
              key={tab.label}
              href={getHref(tab)}
              className={classes}
            >
              <Icon className="size-6" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
