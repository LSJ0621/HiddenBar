import Image from 'next/image';
import { MapPin, Search, ListFilter, MapPinned } from 'lucide-react';

/**
 * 검색 기능(Feature 01)의 정적 UI 목업 컴포넌트.
 * Address / Name / Both / Map Pin 탭과 자동완성 드롭다운을 재현한다.
 */
export function SearchMockup() {
  const tabs = [
    { icon: MapPin, label: 'Address', active: false },
    { icon: Search, label: 'Name', active: true },
    { icon: ListFilter, label: 'Both', active: false },
    { icon: MapPinned, label: 'Map Pin', active: false },
  ];

  return (
    <div className="select-none rounded-tl-2xl rounded-br border border-landing-brown/15 bg-landing-charcoal p-5 md:p-6">
      {/* TabsList */}
      <div className="mb-4 flex rounded-lg border border-landing-brown/10 bg-landing-dark p-1">
        {tabs.map((tab) => (
          <div
            key={tab.label}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-xs ${
              tab.active
                ? 'bg-landing-amber/15 text-landing-amber shadow-sm'
                : 'text-landing-tan'
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
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-landing-tan" />
          <div className="rounded-md border border-landing-brown/20 bg-landing-dark py-2.5 pl-9 pr-3 text-sm text-landing-tan">
            Search by bar name...
          </div>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-landing-brown/20 bg-landing-dark text-landing-amber">
          <Search className="size-4" />
        </div>
      </div>

      {/* 자동완성 드롭다운 */}
      <div className="rounded-md border border-landing-brown/10 bg-landing-dark shadow-md">
        {[
          { name: 'The Alchemist', location: 'Bangkok, Thailand', img: '/images/mockup/cocktail-1.jpg' },
          { name: 'Rabbit Hole', location: 'Singapore', img: '/images/mockup/cocktail-2.jpg' },
        ].map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-3 px-3 py-2.5 ${
              i === 0 ? 'bg-landing-amber/5' : ''
            } ${i > 0 ? 'border-t border-landing-brown/5' : ''}`}
          >
            <div className="relative size-8 shrink-0 overflow-hidden rounded bg-landing-brown/10">
              <Image
                src={item.img}
                alt={item.name}
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-landing-cream">{item.name}</p>
              <p className="text-[10px] text-landing-tan">{item.location}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
