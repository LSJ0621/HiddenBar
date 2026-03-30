'use client';

import Image from 'next/image';
import { LocationProvider } from '@/providers/location-provider';
import { ServiceIntro } from './_components/service-intro';
import { FeatureShowcase } from './_components/feature-showcase';
import { SocialProof } from './_components/social-proof';
import { OwnerCta } from './_components/owner-cta';
import { NearbyBarsList } from './_components/nearby-bars-list';

/** Home page with speakeasy-themed design */
export default function HomePage() {
  return (
    <LocationProvider>
    <div className="bg-[#0a0604] text-[#F0E0C0]">
      {/* Hero Section — leaves room for next section to peek */}
      <section className="relative flex h-[calc(100dvh-6rem)] min-h-[480px] items-center justify-center overflow-hidden">
        {/* Background image */}
        <Image
          src="/images/hero-bg.webp"
          alt=""
          fill
          className="object-cover object-[center_30%]"
          priority
        />
        {/* Multi-layer dark overlay */}
        <div className="absolute inset-0 bg-[rgba(10,6,4,0.55)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0604] via-[rgba(10,6,4,0.4)] to-[rgba(10,6,4,0.55)]" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
          {/* Eyebrow text */}
          <p className="font-mono text-[0.62rem] tracking-[0.45em] uppercase text-[#9B5E1A]">
            CLASSIFIED · MEMBERS ONLY · EST. 2024
          </p>

          {/* Main title with neon glow */}
          <h1 className="font-display text-[clamp(3.8rem,10vw,8rem)] font-light leading-[1.05] tracking-tight text-[#F0E0C0]">
            <span className="text-[#e8973a] text-neon-glow animate-flicker">Discover</span>
            <br />
            <em className="italic">Hidden Bars</em>
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-lg text-[#9a8060]">
            Southeast Asia&apos;s best-kept bars, finally on your map.
          </p>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
          <span className="animate-scroll-pulse font-mono text-[9px] tracking-[0.3em] text-[#9a8060]">
            SCROLL
          </span>
          <div className="h-8 w-px bg-gradient-to-b from-[#9B5E1A] to-transparent" />
        </div>
      </section>

      {/* Content sections */}
      <div className="mx-auto max-w-[1080px] px-6 md:px-8">
        {/* Service Introduction */}
        <ServiceIntro />

        {/* Feature Showcase */}
        <FeatureShowcase />
      </div>

      {/* Social Proof — full-width band */}
      <SocialProof />

      <div className="mx-auto max-w-[1080px] px-6 md:px-8">
        {/* Owner CTA */}
        <OwnerCta />

        {/* Nearby Bars — Bento Grid */}
        <NearbyBarsList />
      </div>
    </div>
    </LocationProvider>
  );
}
