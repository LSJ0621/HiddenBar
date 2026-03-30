import Link from 'next/link';
import { KeyRound } from 'lucide-react';

/** 바 오너를 위한 등록 유도 배너 */
export function OwnerCta() {
  return (
    <section className="py-16 md:py-24">
      <div className="grid grid-cols-1 items-center gap-8 rounded-tl-2xl rounded-br border border-[#9B5E1A]/15 bg-[#120e0a] p-8 md:grid-cols-[1fr_auto] md:gap-12 md:p-12">
        {/* 텍스트 */}
        <div>
          <p className="section-label-line mb-4 font-mono text-[9px] tracking-[0.42em] uppercase text-[#3ECFB2]">
            FOR BAR OWNERS
          </p>
          <h2 className="mb-4 font-display text-[clamp(1.8rem,4vw,3rem)] font-light leading-tight text-[#F0E0C0]">
            Your Bar Deserves to Be
            <br />
            <em className="text-[#e8973a] italic">Discovered</em>
          </h2>
          <p className="mb-6 max-w-lg text-sm leading-relaxed text-[#9a8060] md:text-base">
            List your bar on Hidden Bar. Upload photos, set your menu and hours,
            and let visitors find their way to your door.
          </p>
          <Link
            href="/bars/new"
            className="inline-flex items-center gap-2 rounded-lg border border-[#3ECFB2]/40 px-6 py-3 font-mono text-xs tracking-[0.15em] uppercase text-[#3ECFB2] transition-colors hover:border-[#3ECFB2] hover:bg-[#3ECFB2]/10"
          >
            Register Your Bar
          </Link>
        </div>

        {/* 장식 아이콘 */}
        <div className="hidden items-center justify-center md:flex">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[#9B5E1A]/10 bg-[#0a0604]">
            <KeyRound className="h-12 w-12 text-[#9B5E1A]/40" strokeWidth={1} />
          </div>
        </div>
      </div>
    </section>
  );
}
