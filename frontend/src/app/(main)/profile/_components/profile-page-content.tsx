'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Bookmark,
  Store,
  Plus,
  LogOut,
  Search,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

import { useProfile } from '@/hooks/queries/use-profile';
import { useBookmarks } from '@/hooks/queries/use-bookmarks';
import { useMyBars } from '@/hooks/queries/use-bars';
import { useAuthStore } from '@/hooks/use-auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Role } from '@/types';
import { ROLE_LABELS, BAR_STATUS_LABELS, BAR_STATUS_VARIANTS } from '@/lib/constants';

/** Profile page showing user info with sidebar navigation */
export function ProfilePageContent() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useProfile();
  const { data: bookmarksData } = useBookmarks({ page: 1, limit: 4 });
  const { data: myBarsData } = useMyBars({ limit: 3 });
  const { logout } = useAuthStore();

  if (isUserLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <div className="w-[160px] shrink-0">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-2 h-10 w-full" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
          <div className="flex-1 rounded-lg border border-border/50 p-6">
            <div className="flex flex-col items-center">
              <Skeleton className="size-24 rounded-full" />
              <Skeleton className="mt-4 h-7 w-32" />
              <Skeleton className="mt-2 h-4 w-48" />
              <Skeleton className="mt-3 h-5 w-16" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formattedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const bookmarkCount = bookmarksData?.meta.totalItems ?? 0;
  const myBarsCount = myBarsData?.meta.totalItems ?? 0;

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-6">
        {/* Sidebar — navigation only */}
        <aside className="w-[160px] shrink-0">
          <nav className="flex flex-col" data-testid="profile-menu">
            <Link
              href="/bookmarks"
              className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-accent"
            >
              <Bookmark className="size-4 text-muted-foreground" />
              My Bookmarks
            </Link>
            <Link
              href="/my-bars"
              className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-accent"
            >
              <Store className="size-4 text-muted-foreground" />
              My Bars
            </Link>
            <Link
              href="/bars/new"
              className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-accent"
            >
              <Plus className="size-4 text-muted-foreground" />
              Register Bar
            </Link>

            {user.role === Role.ADMIN && (
              <Link
                href="/admin"
                className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-accent"
              >
                <Shield className="size-4 text-muted-foreground" />
                Admin
              </Link>
            )}

            <Separator className="my-1" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-destructive transition-colors duration-150 hover:bg-destructive/10"
              data-testid="profile-logout-button"
            >
              <LogOut className="size-4" />
              Log Out
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Profile card — vertical layout */}
          <section className="mb-6 rounded-lg border border-border/50 p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="size-24">
                {user.profileImage && (
                  <AvatarImage src={user.profileImage} alt={user.name} />
                )}
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <h1 data-testid="profile-name" className="mt-4 font-display text-2xl font-semibold tracking-tight">
                {user.name}
              </h1>
              <p data-testid="profile-email" className="mt-1 text-sm text-muted-foreground">
                {user.email}
              </p>
              <Badge variant="secondary" className="mt-3">{ROLE_LABELS[user.role]}</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                Joined: {formattedDate}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/profile/edit" data-testid="profile-edit-button">
                  <Pencil className="size-4" />
                  Edit Profile
                </Link>
              </Button>
            </div>
          </section>

          {/* Bookmark preview — desktop only */}
          <section className="mb-6 hidden lg:block">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent Bookmarks</h2>
              <Link href="/bookmarks" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                View All
              </Link>
            </div>
            {bookmarksData && bookmarksData.items.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {bookmarksData.items.map((item) => (
                  <Link key={item.id} href={`/bars/${item.id}`} className="rounded-lg border border-border/50 p-3 transition-colors hover:bg-accent">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.city}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border/50 py-6">
                <p className="text-sm text-muted-foreground">No bookmarked bars yet</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/search">
                    <Search className="size-4" />
                    Search Bars
                  </Link>
                </Button>
              </div>
            )}
          </section>

          {/* My Bars preview — desktop only */}
          {myBarsData && myBarsData.items.length > 0 && (
            <section className="hidden lg:block">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">My Bars</h2>
                <Link href="/my-bars" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                  View All
                </Link>
              </div>
              <div className="space-y-2">
                {myBarsData.items.map((bar) => (
                  <Link key={bar.id} href={`/bars/${bar.id}`} className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-accent">
                    <span className="truncate text-sm font-medium">{bar.name}</span>
                    <Badge variant={BAR_STATUS_VARIANTS[bar.status]} className="shrink-0">{BAR_STATUS_LABELS[bar.status]}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
