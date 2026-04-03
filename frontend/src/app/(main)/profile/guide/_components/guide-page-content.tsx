'use client';

import Link from 'next/link';
import {
  Search,
  MapPin,
  ListFilter,
  MapPinned,
  Star,
  Clock,
  BookOpen,
  Camera,
  Navigation,
  Bus,
  Car,
  Footprints,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Step data definition */
interface GuideStep {
  number: string;
  title: string;
  description: string;
  icons: LucideIcon[];
  bullets: { label: string; detail: string }[];
  cta?: { text: string; href: string };
}

const steps: GuideStep[] = [
  {
    number: '01',
    title: 'Search for Bars',
    description:
      'Head to the search page from the home screen or bottom tab. Four different ways to find your next spot.',
    icons: [Search, MapPin, ListFilter, MapPinned],
    bullets: [
      { label: 'ADDRESS', detail: 'Enter an address to discover nearby bars' },
      { label: 'NAME', detail: 'Search directly by bar name' },
      { label: 'BOTH', detail: 'Combine address and name for precise results' },
      { label: 'MAP PIN', detail: 'Tap anywhere on the map to search nearby bars' },
    ],
    cta: { text: 'Start Searching', href: '/search' },
  },
  {
    number: '02',
    title: 'Explore Bar Details',
    description:
      'Tap a bar from the search results to open its detail page. Everything you need to know before walking in.',
    icons: [Star, Clock, BookOpen, Camera],
    bullets: [
      { label: 'PHOTOS', detail: 'Browse the gallery to get a feel for the vibe' },
      { label: 'HOURS', detail: 'Check real-time operating hours and open/closed status' },
      { label: 'MENU', detail: 'Preview cocktail menus and prices ahead of time' },
      { label: 'REVIEWS', detail: 'Read honest reviews from visitors — or write your own' },
      { label: 'BOOKMARK', detail: 'Save bars you love to revisit them later' },
    ],
  },
  {
    number: '03',
    title: 'Get Directions',
    description:
      'Start navigation from the bar detail page. Confirm your route in the preview to get full turn-by-turn guidance.',
    icons: [Navigation, Bus, Car, Footprints],
    bullets: [
      {
        label: 'OPEN PREVIEW',
        detail: 'Tap the "Directions" button on the bar detail page to open a route preview',
      },
      {
        label: 'TRAVEL MODE',
        detail: 'Choose between walking, transit, driving, or cycling',
      },
      {
        label: 'CONFIRM ROUTE',
        detail:
          'Tap "Get Directions" to lock in your route. Until confirmed, you\'re in preview mode',
      },
      {
        label: 'ROUTE CACHING',
        detail:
          'Confirmed routes are saved automatically — switching travel modes loads instantly',
      },
      {
        label: 'STEP-BY-STEP',
        detail: 'View turn-by-turn directions, estimated time, and total distance at a glance',
      },
    ],
    cta: { text: 'Start with Search', href: '/search' },
  },
];

/** Connector line between step cards */
function StepConnector() {
  return (
    <div className="flex justify-center py-4">
      <div className="flex flex-col items-center gap-1">
        <div className="size-2.5 rounded-full border-2 border-landing-teal bg-landing-teal/20" />
        <div className="h-10 w-px bg-gradient-to-b from-landing-teal to-landing-amber" />
        <div className="size-2.5 rounded-full border-2 border-landing-amber bg-landing-amber/20" />
      </div>
    </div>
  );
}

/** Icon cluster (2x2 grid) */
function IconCluster({ icons }: { icons: LucideIcon[] }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 md:gap-3" style={{ width: 'fit-content' }}>
      {icons.map((Icon, i) => (
        <div
          key={i}
          className="flex size-11 items-center justify-center rounded-full bg-landing-amber/10 md:size-12"
        >
          <Icon className="size-5 text-landing-amber" />
        </div>
      ))}
    </div>
  );
}

/** Individual step card */
function StepCard({ step }: { step: GuideStep }) {
  return (
    <div className="rounded-tl-2xl rounded-br border border-landing-brown/15 bg-landing-charcoal p-5 md:p-8">
      {/* Step number */}
      <p className="mb-4 font-mono text-[9px] tracking-[0.42em] uppercase text-landing-teal">
        STEP {step.number}
      </p>

      {/* Icons */}
      <IconCluster icons={step.icons} />

      {/* Title */}
      <h3 className="mb-3 text-xl font-semibold text-landing-cream">
        {step.title}
      </h3>

      {/* Description */}
      <p className="mb-5 text-sm leading-relaxed text-landing-tan">
        {step.description}
      </p>

      {/* Bullet details */}
      <ul className="space-y-3">
        {step.bullets.map((bullet) => (
          <li key={bullet.label} className="flex gap-3 text-sm">
            <span className="shrink-0 font-mono text-[10px] font-medium tracking-wider text-landing-amber">
              {bullet.label}
            </span>
            <span className="text-xs leading-relaxed text-landing-tan">
              {bullet.detail}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA button */}
      {step.cta && (
        <div className="mt-6">
          <Button asChild size="sm" className="gap-1.5">
            <Link href={step.cta.href}>
              {step.cta.text}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/** User guide main page */
export function GuidePageContent() {
  return (
    <div className="bg-landing-dark">
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
        {/* Page header */}
        <header className="mb-12 md:mb-16">
          <p className="section-label-line mb-4 font-mono text-[9px] tracking-[0.42em] uppercase text-landing-teal">
            SECRET HANDBOOK
          </p>
          <h1 className="mb-4 text-[clamp(1.8rem,4vw,2.8rem)] font-semibold leading-tight text-landing-cream">
            Hidden Bar{' '}
            <em className="font-display text-landing-amber italic">User Guide</em>
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-landing-tan">
            Three steps to discover your next secret bar.
            <br />
            Ready to open the door?
          </p>
        </header>

        {/* Step cards */}
        <div>
          {steps.map((step, index) => (
            <div key={step.number}>
              <StepCard step={step} />
              {index < steps.length - 1 && <StepConnector />}
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <footer className="mt-12 border-t border-landing-brown/10 pt-10 text-center md:mt-16">
          <p className="mb-6 font-display text-lg text-landing-cream">
            It&apos;s your turn to open the door.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/search">
              Find a Bar
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </footer>
      </div>
    </div>
  );
}
