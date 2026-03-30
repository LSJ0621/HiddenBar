'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { EmptySection } from './operating-hours-section';

const MENU_PREVIEW_COUNT = 5;

interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
}

interface MenuSectionProps {
  menuItems: MenuItem[];
  isOwner: boolean;
  barId: number;
}

/** Menu section — desktop flat list with "show more" + mobile accordion */
export const MenuSection = React.memo(function MenuSection({
  menuItems,
  isOwner,
  barId,
}: MenuSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const hasExtra = menuItems.length > MENU_PREVIEW_COUNT;
  const visibleItems = showAll ? menuItems : menuItems.slice(0, MENU_PREVIEW_COUNT);

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold lg:text-xl text-base">
        Menu{menuItems.length > 0 && ` (${menuItems.length})`}
      </h2>
      {menuItems.length > 0 ? (
        <div className="space-y-3">
          <MenuList items={visibleItems} />
          {hasExtra && !showAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(true)}
              className="w-full"
            >
              Show {menuItems.length - MENU_PREVIEW_COUNT} more
            </Button>
          )}
        </div>
      ) : (
        <EmptySection
          message="No menu items registered"
          isOwner={isOwner}
          editHref={`/bars/${barId}/edit`}
          editLabel="Add Menu"
        />
      )}
    </section>
  );
});

/** Menu item list */
function MenuList({
  items,
}: {
  items: MenuItem[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-start justify-between">
          <div>
            <p className="font-medium">{item.name}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
          </div>
          <span className="whitespace-nowrap font-mono text-sm">
            {item.price.toLocaleString()} {item.currency}
          </span>
        </div>
      ))}
    </div>
  );
}
