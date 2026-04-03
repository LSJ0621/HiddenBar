import Link from 'next/link';
import { KeyRound } from 'lucide-react';

/** 바 오너를 위한 등록 유도 배너 */
export function OwnerCta() {
  return (
    <section className="py-16 md:py-24">
      <div className="grid grid-cols-1 items-center gap-8 rounded-tl-2xl rounded-br border border-landing-brown/15 bg-landing-charcoal p-8 md:grid-cols-[1fr_auto] md:gap-12 md:p-12">
        {/* 텍스트 */}
        <div>
          <p className="section-label-line mb-4 font-mono text-[9px] tracking-[0.42em] uppercase text-landing-teal">
            FOR BAR OWNERS
          </p>
          <h2 className="mb-4 font-display text-[clamp(1.8rem,4vw,3rem)] font-light leading-tight text-landing-cream">
            Your Bar Deserves to Be
            <br />
            <em className="text-landing-amber italic">Discovered</em>
          </h2>
          <p className="mb-6 max-w-lg text-sm leading-relaxed text-landing-tan md:text-base">
            List your bar on Hidden Bar. Upload photos, set your menu and hours,
            and let visitors find their way to your door.
          </p>
          <Link
            href="/bars/new"
            className="inline-flex items-center gap-2 rounded-lg border border-landing-teal/40 px-6 py-3 font-mono text-xs tracking-[0.15em] uppercase text-landing-teal transition-colors hover:border-landing-teal hover:bg-landing-teal/10"
          >
            Register Your Bar
          </Link>
        </div>

        {/* 장식 아이콘 */}
        <div className="hidden items-center justify-center md:flex">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-landing-brown/10 bg-landing-dark">
            <KeyRound className="h-12 w-12 text-landing-brown/40" strokeWidth={1} />
          </div>
        </div>
      </div>
    </section>
  );
}
