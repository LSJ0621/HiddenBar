import Image from 'next/image';
import {
  MapPin,
  Search,
  ListFilter,
  MapPinned,
  Bookmark,
  Star,
  ImageOff,
  Pencil,
  RefreshCw,
  Camera,
} from 'lucide-react';
import type { ReactNode } from 'react';

/** Feature 정의 */
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
        or Just a <em className="text-[#e8973a] italic">Pin on the Map</em>
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
        You <em className="text-[#e8973a] italic">Walk In</em>
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
        Never Get <em className="text-[#e8973a] italic">Lost</em>
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
        <em className="text-[#e8973a] italic">Remember</em>
      </>
    ),
    description:
      'Bookmark bars you want to visit, leave star ratings with photo reviews, and build your personal collection of hidden gems.',
    tagline: 'YOUR BARS · YOUR RATINGS · YOUR MAP',
    visual: <BookmarkMockup />,
  },
];

/* ──────────────────────────────────────────
   Feature 01 — 검색 탭 (Address / Name / Both / Map Pin)
   완전히 정적인 목업 — 인터랙션 없음
   ────────────────────────────────────────── */
function SearchMockup() {
  const tabs = [
    { icon: MapPin, label: 'Address', active: false },
    { icon: Search, label: 'Name', active: true },
    { icon: ListFilter, label: 'Both', active: false },
    { icon: MapPinned, label: 'Map Pin', active: false },
  ];

  return (
    <div className="select-none rounded-tl-2xl rounded-br border border-[#9B5E1A]/15 bg-[#120e0a] p-5 md:p-6">
      {/* TabsList */}
      <div className="mb-4 flex rounded-lg border border-[#9B5E1A]/10 bg-[#0a0604] p-1">
        {tabs.map((tab) => (
          <div
            key={tab.label}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-xs ${
              tab.active
                ? 'bg-[#e8973a]/15 text-[#e8973a] shadow-sm'
                : 'text-[#9a8060]'
            }`}
          >
            <tab.icon className="size-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </div>
        ))}
      </div>

      {/* Name 탭 — 검색 입력 + 검색 버튼 */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9a8060]" />
          <div className="rounded-md border border-[#9B5E1A]/20 bg-[#0a0604] py-2.5 pl-9 pr-3 text-sm text-[#9a8060]">
            Search by bar name...
          </div>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#9B5E1A]/20 bg-[#0a0604] text-[#e8973a]">
          <Search className="size-4" />
        </div>
      </div>

      {/* 자동완성 드롭다운 */}
      <div className="rounded-md border border-[#9B5E1A]/10 bg-[#0a0604] shadow-md">
        {[
          { name: 'The Alchemist', location: 'Bangkok, Thailand', img: '/images/mockup/cocktail-1.jpg' },
          { name: 'Rabbit Hole', location: 'Singapore', img: '/images/mockup/cocktail-2.jpg' },
        ].map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-3 px-3 py-2.5 ${
              i === 0 ? 'bg-[#e8973a]/5' : ''
            } ${i > 0 ? 'border-t border-[#9B5E1A]/5' : ''}`}
          >
            <div className="relative size-8 shrink-0 overflow-hidden rounded bg-[#9B5E1A]/10">
              <Image
                src={item.img}
                alt={item.name}
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#F0E0C0]">{item.name}</p>
              <p className="text-[10px] text-[#9a8060]">{item.location}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Feature 02 — 바 상세 페이지
   완전히 정적인 목업 — 인터랙션 없음
   ────────────────────────────────────────── */
function DetailMockup() {
  return (
    <div className="select-none rounded-tl-2xl rounded-br border border-[#9B5E1A]/15 bg-[#120e0a] p-5 md:p-6">
      {/* 사진 갤러리 */}
      <div className="relative mb-4 aspect-[21/9] w-full overflow-hidden rounded-lg bg-[#1a1410]">
        <Image
          src="/images/mockup/bar-interior.jpg"
          alt="Bar interior photo gallery preview"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <p className="rounded-full bg-black/50 px-2 py-0.5 font-mono text-[9px] text-[#9a8060]">
            1 / 5
          </p>
        </div>
      </div>

      {/* 바 이름 + 북마크 */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-display text-lg text-[#F0E0C0]">The Alchemist</h4>
          <div className="flex items-center gap-1">
            <Star className="size-3.5 fill-[#e8973a] text-[#e8973a]" />
            <span className="text-xs font-medium text-[#F0E0C0]">4.2</span>
            <span className="text-xs text-[#9a8060]">(28)</span>
          </div>
          {/* Open 뱃지 + 오늘 영업시간 */}
          <div className="flex items-center gap-2">
            <span className="rounded border border-[#22c55e]/20 bg-[#22c55e]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#22c55e]">
              Open
            </span>
            <span className="text-xs text-[#9a8060]">18:00 – 02:00</span>
          </div>
        </div>
        {/* BookmarkButton — 정적 */}
        <div className="flex items-center gap-1 rounded-md px-2 py-1 text-[#9a8060]">
          <Bookmark className="size-4" />
          <span className="text-xs">12</span>
        </div>
      </div>

      {/* 주소 */}
      <div className="mb-4 flex items-center gap-2 text-xs text-[#9a8060]">
        <MapPin className="size-3.5 shrink-0" />
        <span>Sukhumvit Soi 11, Bangkok, Thailand</span>
      </div>

      {/* 메뉴 */}
      <div className="border-t border-[#9B5E1A]/10 pt-3">
        <p className="mb-2 text-sm font-semibold text-[#F0E0C0]">Menu (8)</p>
        <div className="space-y-2">
          {[
            { name: 'Smoky Old Fashioned', price: '฿420' },
            { name: 'Secret Garden Sour', price: '฿380' },
            { name: 'Midnight Negroni', price: '฿450' },
          ].map((item) => (
            <div key={item.name} className="flex items-start justify-between">
              <span className="text-xs font-medium text-[#F0E0C0]">{item.name}</span>
              <span className="whitespace-nowrap font-mono text-xs text-[#9a8060]">
                {item.price}
              </span>
            </div>
          ))}
          <p className="w-full py-1 text-center text-[10px] text-[#9a8060]">
            Show 5 more
          </p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Feature 03 — 길안내 (Walking / Transit / Driving)
   완전히 정적인 목업 — 인터랙션 없음
   ────────────────────────────────────────── */
function DirectionsMockup() {
  return (
    <div className="select-none rounded-tl-2xl rounded-br border border-[#9B5E1A]/15 bg-[#120e0a] p-5 md:p-6">
      {/* 목적지 헤더 */}
      <p className="mb-3 text-sm font-semibold text-[#F0E0C0]">
        Directions to The Alchemist
      </p>

      {/* TravelModeSelector — ToggleGroup 정적 재현 */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex rounded-md border border-[#9B5E1A]/15">
          {['Walking', 'Transit', 'Driving'].map((mode, i) => (
            <div
              key={mode}
              className={`px-3 py-1.5 text-xs ${
                mode === 'Walking'
                  ? 'bg-[#e8973a]/15 text-[#e8973a]'
                  : 'text-[#9a8060]'
              } ${i > 0 ? 'border-l border-[#9B5E1A]/15' : ''} ${
                i === 0 ? 'rounded-l-md' : ''
              } ${i === 2 ? 'rounded-r-md' : ''}`}
            >
              {mode}
            </div>
          ))}
        </div>
        <div className="flex size-8 items-center justify-center rounded-md text-[#9a8060]">
          <RefreshCw className="size-3.5" />
        </div>
      </div>

      {/* DirectionsInfo — 거리 + 시간 */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="font-medium text-[#F0E0C0]">1.2 km</span>
        <span className="font-medium text-[#F0E0C0]">15 min</span>
      </div>

      {/* Step list */}
      <ol className="space-y-2.5">
        {[
          'Head south on Sukhumvit Rd',
          'Turn left at Soi 11',
          'Destination will be on your right',
        ].map((step, i) => (
          <li key={i} className="flex gap-2.5 text-xs">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1a1410] text-[10px] font-medium text-[#9a8060]">
              {i + 1}
            </span>
            <span className="text-[#F0E0C0]">{step}</span>
          </li>
        ))}
      </ol>

      {/* 출발/도착 시각화 */}
      <div className="mt-4 flex items-center gap-3 border-t border-[#9B5E1A]/10 pt-4">
        <div className="flex flex-col items-center gap-1">
          <div className="size-2.5 rounded-full border-2 border-[#3ECFB2] bg-[#3ECFB2]/20" />
          <div className="h-6 w-px bg-gradient-to-b from-[#3ECFB2] to-[#e8973a]" />
          <div className="size-2.5 rounded-full border-2 border-[#e8973a] bg-[#e8973a]/20" />
        </div>
        <div className="flex-1 space-y-3">
          <p className="text-xs text-[#F0E0C0]">Your Location</p>
          <p className="text-xs text-[#e8973a]">The Alchemist</p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Feature 04 — 북마크 & 리뷰
   완전히 정적인 목업 — 인터랙션 없음
   ────────────────────────────────────────── */
function BookmarkMockup() {
  const bookmarks = [
    { name: 'The Alchemist', city: 'Bangkok', country: 'Thailand', rating: 4.2, reviews: 28, date: '2 days ago', img: '/images/mockup/cocktail-1.jpg' },
    { name: 'Rabbit Hole', city: 'Singapore', country: 'Singapore', rating: 4.5, reviews: 42, date: '1 week ago', img: '/images/mockup/cocktail-2.jpg' },
    { name: 'Iron Fairies', city: 'Bangkok', country: 'Thailand', rating: 4.0, reviews: 15, date: '2 weeks ago', img: '/images/mockup/bar-shelf.jpg' },
  ];

  return (
    <div className="select-none rounded-tl-2xl rounded-br border border-[#9B5E1A]/15 bg-[#120e0a] p-5 md:p-6">
      {/* 페이지 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <p className="font-display text-lg text-[#F0E0C0]">My Bookmarks</p>
          <span className="text-xs text-[#9a8060]">3</span>
        </div>
        <div className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#9a8060]">
          <Pencil className="size-3" />
          Edit
        </div>
      </div>

      {/* 북마크 리스트 */}
      <div className="divide-y divide-[#9B5E1A]/8">
        {bookmarks.map((bar) => (
          <div
            key={bar.name}
            className="flex items-center gap-3 border-l-2 border-l-transparent py-3 pl-2"
          >
            {/* Thumbnail */}
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-[#1a1410]">
              <Image
                src={bar.img}
                alt={bar.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            {/* Info */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-xs font-semibold text-[#F0E0C0]">{bar.name}</p>
              <div className="flex items-center gap-1.5">
                <Star className="size-3 fill-[#e8973a] text-[#e8973a]" />
                <span className="text-[10px] font-medium text-[#F0E0C0]">{bar.rating}</span>
                <span className="text-[10px] text-[#9a8060]">({bar.reviews})</span>
              </div>
              <p className="text-[10px] text-[#9a8060]">{bar.city}, {bar.country}</p>
              <p className="text-[10px] text-[#9a8060]">Bookmarked {bar.date}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 리뷰 작성 미니 UI */}
      <div className="mt-4 border-t border-[#9B5E1A]/10 pt-3">
        <p className="mb-2 text-[10px] font-semibold text-[#F0E0C0]">
          Write a Review
        </p>
        <div className="mb-2 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`size-4 ${
                i <= 4
                  ? 'fill-[#e8973a] text-[#e8973a]'
                  : 'text-[#9B5E1A]/30'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-md border border-[#9B5E1A]/15 bg-[#0a0604] px-3 py-2">
            <span className="text-xs text-[#9a8060]">Amazing atmosphere...</span>
          </div>
          <div className="flex size-8 items-center justify-center rounded-md bg-[#9B5E1A]/10">
            <Camera className="size-3.5 text-[#9a8060]" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
              <p className="section-label-line mb-4 font-mono text-[9px] tracking-[0.42em] uppercase text-[#3ECFB2]">
                {feature.eyebrow}
              </p>
              <h3 className="mb-4 font-display text-[clamp(1.5rem,4vw,2.5rem)] font-light leading-tight text-[#F0E0C0]">
                {feature.title}
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-[#9a8060] md:text-base">
                {feature.description}
              </p>
              <p className="font-mono text-[10px] tracking-[0.25em] text-[#e8973a]">
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
