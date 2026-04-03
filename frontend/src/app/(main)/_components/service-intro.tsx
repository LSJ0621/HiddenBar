import { Search, Navigation, Star } from 'lucide-react';

/** 서비스 소개 카드 데이터 */
const values = [
  {
    icon: Search,
    title: 'Discover',
    description:
      'Find hidden bars by name, address, or by dropping a pin on the map. Four search modes, one destination.',
  },
  {
    icon: Navigation,
    title: 'Navigate',
    description:
      'Get directions by foot, car, transit, or bike. Step-by-step route guidance to any bar\'s doorstep.',
  },
  {
    icon: Star,
    title: 'Share',
    description:
      'Rate your experience, write reviews with photos, and bookmark your favorites for next time.',
  },
];

/** "What is Hidden Bar?" 서비스 소개 섹션 — 핵심 가치 3개 카드 */
export function ServiceIntro() {
  return (
    <section className="py-16 md:py-24">
      {/* 헤더 */}
      <div className="mb-12 md:mb-16">
        <p className="section-label-line mb-4 font-mono text-[9px] tracking-[0.42em] uppercase text-landing-teal">
          WHAT WE DO
        </p>
        <h2 className="mb-6 font-display text-[clamp(2rem,5vw,3.5rem)] font-light leading-tight text-landing-cream">
          Every City Has a <em className="text-landing-amber italic">Secret</em>.
          <br />
          We Help You Find It.
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-landing-tan">
          Hidden Bar is a discovery platform for speakeasies across Southeast Asia.
          Search, explore, navigate — and never miss a door again.
        </p>
      </div>

      {/* 3개 밸류 카드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {values.map((value) => (
          <div
            key={value.title}
            className="rounded-tl-2xl rounded-br border border-landing-brown/10 bg-landing-charcoal p-6 md:p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-landing-amber/10">
              <value.icon className="h-5 w-5 text-landing-amber" />
            </div>
            <h3 className="mb-3 font-display text-xl text-landing-cream">
              {value.title}
            </h3>
            <p className="text-sm leading-relaxed text-landing-tan">
              {value.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
