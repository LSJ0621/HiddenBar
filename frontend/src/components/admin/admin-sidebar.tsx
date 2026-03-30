'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Store, Users, ScrollText, Flag, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/hooks/use-auth';
import { Role } from '@/types';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bars', label: 'Bar Management', icon: Store },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/review-reports', label: 'Review Reports', icon: Flag },
  { href: '/admin/actions', label: 'Activity Log', icon: ScrollText },
];

interface AdminSidebarProps {
  /** 메뉴 항목 클릭 시 호출되는 콜백 (모바일 Sheet 닫기용) */
  onNavigate?: () => void;
}

/** Admin sidebar navigation with role check */
export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && user.role !== Role.ADMIN) {
      toast.error('Admin access required');
      router.push('/');
    }
  }, [user, router]);

  if (!user || user.role !== Role.ADMIN) {
    return null;
  }

  return (
    <nav data-testid="admin-sidebar" className="flex h-full flex-col p-4">
      <div className="flex flex-col gap-1">
        <h2 className="mb-4 px-3 font-display text-lg font-semibold tracking-tight text-primary">Admin</h2>
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive && 'border-l-2 border-l-primary bg-accent text-accent-foreground',
              )}
            >
              <item.icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto border-t border-t-border/50 pt-4">
        <Link
          href="/"
          onClick={() => onNavigate?.()}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Site
        </Link>
      </div>
    </nav>
  );
}
