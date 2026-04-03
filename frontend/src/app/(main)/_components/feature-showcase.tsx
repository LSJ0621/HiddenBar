import type { ReactNode } from 'react';
import { SearchMockup } from '@/app/(main)/_components/search-mockup';
import { DetailMockup } from '@/app/(main)/_components/detail-mockup';
import { DirectionsMockup } from '@/app/(main)/_components/directions-mockup';
import { BookmarkMockup } from '@/app/(main)/_components/bookmark-mockup';

/** 개별 Feature 항목 정의 */
interface Feature {
  eyebrow: string;
  title: ReactNode;
  description: string;
  tagline: string;
  visual: ReactNode;
}

const features: Feature[] = [
  {
    eyebrow: 'FEATURE 01',
    title: (
      <>
        Search by Name, Address,
        <br />
        or Just a <em className="text-landing-amber italic">Pin on the Map</em>
      </>
    ),
    description:
      'Four ways to find your next spot. Type a bar name for instant suggestions, enter an address to search nearby, combine both filters, or drop a pin on the map.',
    tagline: 'ADDRESS · NAME · BOTH · MAP PIN',
    visual: <SearchMockup />,
  },
  {
    eyebrow: 'FEATURE 02',
    title: (
      <>
        Every Detail, Before
        <br />
        You <em className="text-landing-amber italic">Walk In</em>
      </>
    ),
    description:
      'Photos, menus with prices, operating hours with live "open now" status, and honest reviews from real visitors. Know exactly what to expect.',
    tagline: 'PHOTOS · MENUS · HOURS · REVIEWS',
    visual: <DetailMockup />,
  },
  {
    eyebrow: 'FEATURE 03',
    title: (
      <>
        Never Get <em className="text-landing-amber italic">Lost</em>
        <br />
        on the Way
      </>
    ),
    description:
      'Get turn-by-turn directions on foot, by transit, or by car. See estimated time and distance — with multiple route options for transit.',
    tagline: 'WALKING · TRANSIT · DRIVING',
    visual: <DirectionsMockup />,
  },
  {
    eyebrow: 'FEATURE 04',
    title: (
      <>
        Save, Rate,
        <br />
        <em className="text-landing-amber italic">Remember</em>
      </>
    ),
    description:
      'Bookmark bars you want to visit, leave star ratings with photo reviews, and build your personal collection of hidden gems.',
    tagline: 'YOUR BARS · YOUR RATINGS · YOUR MAP',
    visual: <BookmarkMockup />,
  },
];

/** 핵심 기능 4개를 지그재그 레이아웃으로 소개하는 섹션 */
export function FeatureShowcase() {
  return (
    <section className="py-16 md:py-24">
      {features.map((feature, index) => {
        const isReversed = index % 2 === 1;

        return (
          <div
            key={feature.eyebrow}
            className={`mb-20 grid grid-cols-1 items-center gap-8 last:mb-0 md:gap-12 lg:grid-cols-2 lg:gap-16 ${
              isReversed ? 'lg:[direction:rtl]' : ''
            }`}
          >
            {/* 텍스트 영역 */}
            <div className={isReversed ? 'lg:[direction:ltr]' : ''}>
              <p className="section-label-line mb-4 font-mono text-[9px] tracking-[0.42em] uppercase text-landing-teal">
                {feature.eyebrow}
              </p>
              <h3 className="mb-4 font-display text-[clamp(1.5rem,4vw,2.5rem)] font-light leading-tight text-landing-cream">
                {feature.title}
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-landing-tan md:text-base">
                {feature.description}
              </p>
              <p className="font-mono text-[10px] tracking-[0.25em] text-landing-amber">
                {feature.tagline}
              </p>
            </div>

            {/* 비주얼 영역 */}
            <div className={isReversed ? 'lg:[direction:ltr]' : ''}>
              {feature.visual}
            </div>
          </div>
        );
      })}
    </section>
  );
}
