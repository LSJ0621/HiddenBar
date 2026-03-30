'use client';

import { useState } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

/** Admin layout with sidebar navigation */
export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <NuqsAdapter>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-r-border/50 bg-card/50 lg:block">
          <AdminSidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            {/* Mobile sidebar */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mb-6 shrink-0 lg:hidden"
                >
                  <Menu className="size-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-card/50 p-0">
                <SheetTitle className="sr-only">Admin Menu</SheetTitle>
                <SheetDescription className="sr-only">Admin sidebar menu</SheetDescription>
                <AdminSidebar onNavigate={() => setSheetOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1 pl-12 lg:pl-0">{children}</div>
          </div>
        </main>
      </div>
    </NuqsAdapter>
  );
}
