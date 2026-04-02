'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, LogOut, Bookmark, Store, PlusCircle, Shield, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/hooks/use-auth';
import { isLoggedIn, getCachedUser, type CachedUser } from '@/lib/token';
import { cn } from '@/lib/utils';
import { Role } from '@/types';

/** Main site header with navigation and auth controls */
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [loggedIn, setLoggedIn] = useState(false);
  const [cachedUser, setCachedUser] = useState<CachedUser | null>(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    if (!user) {
      setCachedUser(getCachedUser());
    }
  }, [user]);

  /** 헤더 표시용 유저 정보 — Redux 우선, 없으면 캐시 폴백 */
  const displayUser = user ?? cachedUser;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4 md:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 font-display text-xl tracking-tight text-primary transition-colors hover:text-primary"
        >
          Hidden Bar
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { href: '/', label: 'Home' },
            { href: '/search', label: 'Search' },
            { href: '/directions', label: 'Directions' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                pathname === href
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-2">
          {loggedIn ? (
            <>
              {/* Mobile: simple link to profile (bottom tab bar handles navigation) */}
              <Button
                variant="ghost"
                className="flex items-center gap-2 rounded-full px-2 md:hidden"
                onClick={() => router.push('/profile')}
              >
                <Avatar size="sm">
                  {displayUser?.profileImage && (
                    <AvatarImage src={displayUser.profileImage} alt={displayUser.name} />
                  )}
                  <AvatarFallback>
                    {displayUser?.name?.charAt(0).toUpperCase() ?? '·'}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[80px] truncate text-sm font-medium">{displayUser?.name}</span>
              </Button>

              {/* Desktop: avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden items-center gap-2 rounded-full px-2 md:flex" data-testid="header-avatar-trigger">
                    <Avatar size="sm">
                      {displayUser?.profileImage && (
                        <AvatarImage src={displayUser.profileImage} alt={displayUser.name} />
                      )}
                      <AvatarFallback>
                        {displayUser?.name?.charAt(0).toUpperCase() ?? '·'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[120px] truncate text-sm font-medium" data-testid="header-user-name">{displayUser?.name}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{displayUser?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 size-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bookmarks">
                      <Bookmark className="mr-2 size-4" />
                      My Bookmarks
                    </Link>
                  </DropdownMenuItem>
                  {/* TODO: 오너 여부(isOwner) API 지원 시 조건부 렌더링 */}
                  <DropdownMenuItem asChild>
                    <Link href="/my-bars">
                      <Store className="mr-2 size-4" />
                      My Bars
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bars/new">
                      <PlusCircle className="mr-2 size-4" />
                      Register Bar
                    </Link>
                  </DropdownMenuItem>
                  {displayUser?.role === Role.ADMIN && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <Shield className="mr-2 size-4" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="header-logout-button">
                    <LogOut className="mr-2 size-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/signup"
                className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
              >
                Sign Up
              </Link>
              <Button size="sm" asChild>
                <Link href="/login">Log In</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
