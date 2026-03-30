'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Phone,
  Globe,
  Pencil,
  ChevronDown,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookmarkButton } from '@/components/bars/bookmark-button';
import { RatingBadge } from '@/components/ui/rating-badge';

interface BarInfoHeaderProps {
  bar: {
    id: number;
    name: string;
    description: string | null;
    address: string;
    city: string;
    country: string;
    phone: string | null;
    website: string | null;
    bookmarkCount: number;
    isBookmarked?: boolean;
    averageRating: number;
    reviewCount: number;
  };
  isOwner: boolean;
  todaySummary: string | null;
  openStatus: boolean | null;
  onDeleteClick: () => void;
  onStickyChange: (visible: boolean) => void;
}

/** Bar name, operating status, bookmark, owner dropdown, and mobile contact info */
export const BarInfoHeader = React.memo(function BarInfoHeader({
  bar,
  isOwner,
  todaySummary,
  openStatus,
  onDeleteClick,
  onStickyChange,
}: BarInfoHeaderProps) {
  const nameRef = useRef<HTMLHeadingElement>(null);

  // Notify parent when bar name scrolls out of view (for sticky header)
  useEffect(() => {
    if (!nameRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => onStickyChange(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' },
    );
    observer.observe(nameRef.current);
    return () => observer.disconnect();
  }, [onStickyChange]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1
              ref={nameRef}
              className="font-display text-3xl tracking-tight md:text-4xl"
              data-testid="bar-detail-name"
            >
              {bar.name}
            </h1>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="bar-detail-edit-button">
                    <Pencil className="mr-1 size-4" />
                    Edit
                    <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href={`/bars/${bar.id}/edit`}>Edit</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onDeleteClick}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RatingBadge
              averageRating={bar.averageRating}
              reviewCount={bar.reviewCount}
              showEmpty
            />
          </div>
          {todaySummary && (
            <div className="flex items-center gap-2 text-sm">
              {openStatus === true && (
                <Badge className="border-success/20 bg-success/10 text-success">
                  Open
                </Badge>
              )}
              {openStatus === false && (
                <Badge variant="secondary">Closed</Badge>
              )}
              <span className="text-muted-foreground">{todaySummary}</span>
            </div>
          )}
        </div>
        <BookmarkButton
          barId={bar.id}
          initialCount={bar.bookmarkCount}
          initialIsBookmarked={bar.isBookmarked}
        />
      </div>

      {bar.description && (
        <p className="text-muted-foreground">{bar.description}</p>
      )}

      {/* Contact info — mobile only (desktop uses sidebar card) */}
      <div className="mt-4 space-y-2 text-sm lg:hidden">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <span>
            {bar.address}, {bar.city}, {bar.country}
          </span>
        </div>
        {bar.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-4 shrink-0 text-muted-foreground" />
            <a href={`tel:${bar.phone}`} className="hover:underline">
              {bar.phone}
            </a>
          </div>
        )}
        {bar.website && (
          <div className="flex items-center gap-2">
            <Globe className="size-4 shrink-0 text-muted-foreground" />
            <a
              href={bar.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {bar.website}
            </a>
          </div>
        )}
      </div>
    </section>
  );
});
