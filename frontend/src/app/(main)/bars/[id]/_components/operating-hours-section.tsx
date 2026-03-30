'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DAY_OF_WEEK_LABELS } from '@/lib/constants';
import { DAY_ORDER, getTodayDayOfWeek } from './lib/operating-hours';
import type { OperatingHoursEntry } from './lib/operating-hours';

interface OperatingHoursSectionProps {
  operatingHours: OperatingHoursEntry[];
  todaySummary: string | null;
  hoursOpen: boolean;
  onHoursOpenChange: (open: boolean) => void;
  isOwner: boolean;
  barId: number;
}

/** Operating hours — desktop Collapsible + mobile Accordion */
export const OperatingHoursSection = React.memo(function OperatingHoursSection({
  operatingHours,
  todaySummary,
  hoursOpen,
  onHoursOpenChange,
  isOwner,
  barId,
}: OperatingHoursSectionProps) {
  return (
    <>
      {/* Desktop: Collapsible */}
      <section className="hidden lg:block">
        <OperatingHoursCollapsible
          operatingHours={operatingHours}
          todaySummary={todaySummary}
          isOpen={hoursOpen}
          onOpenChange={onHoursOpenChange}
          isOwner={isOwner}
          barId={barId}
        />
      </section>

      {/* Mobile: Accordion */}
      <AccordionItem value="hours" className="lg:hidden">
        <AccordionTrigger className="text-base font-semibold">
          <span className="flex items-center gap-2">
            <Clock className="size-4" />
            Hours
            {todaySummary && (
              <span className="text-sm font-normal text-muted-foreground">
                · {todaySummary}
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {operatingHours.length > 0 ? (
            <OperatingHoursTable operatingHours={operatingHours} />
          ) : (
            <EmptySection
              message="No operating hours registered"
              isOwner={isOwner}
              editHref={`/bars/${barId}/edit`}
              editLabel="Add Hours"
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </>
  );
});

/** Desktop: Collapsible operating hours */
function OperatingHoursCollapsible({
  operatingHours,
  todaySummary,
  isOpen,
  onOpenChange,
  isOwner,
  barId,
}: {
  operatingHours: OperatingHoursEntry[];
  todaySummary: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner: boolean;
  barId: number;
}) {
  if (operatingHours.length === 0) {
    return (
      <>
        <h2 className="mb-4 text-xl font-semibold">Operating Hours</h2>
        <EmptySection
          message="No operating hours registered"
          isOwner={isOwner}
          editHref={`/bars/${barId}/edit`}
          editLabel="Add Hours"
        />
      </>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Operating Hours</h2>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            <ChevronsUpDown className="size-4" />
            {isOpen ? 'Collapse' : 'View All Hours'}
          </Button>
        </CollapsibleTrigger>
      </div>
      {todaySummary && !isOpen && (
        <p className="mt-1 text-sm text-muted-foreground">{todaySummary}</p>
      )}
      <CollapsibleContent>
        <div className="mt-3">
          <OperatingHoursTable operatingHours={operatingHours} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Operating hours table — shared by desktop and mobile */
function OperatingHoursTable({
  operatingHours,
}: {
  operatingHours: OperatingHoursEntry[];
}) {
  const today = getTodayDayOfWeek();

  return (
    <div className="space-y-1 text-sm">
      {DAY_ORDER.map((day) => {
        const hours = operatingHours.find((h) => h.dayOfWeek === day);
        const isToday = day === today;
        return (
          <div
            key={day}
            className={cn(
              'flex justify-between rounded px-2 py-1',
              isToday && 'bg-accent font-medium',
            )}
          >
            <span>{DAY_OF_WEEK_LABELS[day]}</span>
            <span className={cn('font-mono', !isToday && 'text-muted-foreground')}>
              {hours
                ? hours.isClosed
                  ? 'Closed'
                  : `${hours.openTime} - ${hours.closeTime}`
                : '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Empty state for sections with optional owner CTA */
export function EmptySection({
  message,
  isOwner,
  editHref,
  editLabel,
}: {
  message: string;
  isOwner: boolean;
  editHref: string;
  editLabel: string;
}) {
  return (
    <div className="py-4 text-center text-sm text-muted-foreground">
      <p>{message}</p>
      {isOwner && (
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <Link href={editHref}>{editLabel}</Link>
        </Button>
      )}
    </div>
  );
}
