import Image from 'next/image';
import { MapPin, Bookmark, Star } from 'lucide-react';

/**
 * 바 상세 페이지(Feature 02)의 정적 UI 목업 컴포넌트.
 * 사진 갤러리, 바 정보(별점·영업시간), 주소, 메뉴 목록을 재현한다.
 */
export function DetailMockup() {
  return (
    <div className="select-none rounded-tl-2xl rounded-br border border-landing-brown/15 bg-landing-charcoal p-5 md:p-6">
      {/* 사진 갤러리 */}
      <div className="relative mb-4 aspect-[21/9] w-full overflow-hidden rounded-lg bg-landing-deep">
        <Image
          src="/images/mockup/bar-interior.jpg"
          alt="Bar interior photo gallery preview"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <p className="rounded-full bg-black/50 px-2 py-0.5 font-mono text-[9px] text-landing-tan">
            1 / 5
          </p>
        </div>
      </div>

      {/* 바 이름 + 북마크 */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="font-display text-lg text-landing-cream">The Alchemist</h4>
          <div className="flex items-center gap-1">
            <Star className="size-3.5 fill-landing-amber text-landing-amber" />
            <span className="text-xs font-medium text-landing-cream">4.2</span>
            <span className="text-xs text-landing-tan">(28)</span>
          </div>
          {/* Open 뱃지 + 오늘 영업시간 */}
          <div className="flex items-center gap-2">
            <span className="rounded border border-[#22c55e]/20 bg-[#22c55e]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#22c55e]">
              Open
            </span>
            <span className="text-xs text-landing-tan">18:00 – 02:00</span>
          </div>
        </div>
        {/* BookmarkButton — 정적 */}
        <div className="flex items-center gap-1 rounded-md px-2 py-1 text-landing-tan">
          <Bookmark className="size-4" />
          <span className="text-xs">12</span>
        </div>
      </div>

      {/* 주소 */}
      <div className="mb-4 flex items-center gap-2 text-xs text-landing-tan">
        <MapPin className="size-3.5 shrink-0" />
        <span>Sukhumvit Soi 11, Bangkok, Thailand</span>
      </div>

      {/* 메뉴 */}
      <div className="border-t border-landing-brown/10 pt-3">
        <p className="mb-2 text-sm font-semibold text-landing-cream">Menu (8)</p>
        <div className="space-y-2">
          {[
            { name: 'Smoky Old Fashioned', price: '฿420' },
            { name: 'Secret Garden Sour', price: '฿380' },
            { name: 'Midnight Negroni', price: '฿450' },
          ].map((item) => (
            <div key={item.name} className="flex items-start justify-between">
              <span className="text-xs font-medium text-landing-cream">{item.name}</span>
              <span className="whitespace-nowrap font-mono text-xs text-landing-tan">
                {item.price}
              </span>
            </div>
          ))}
          <p className="w-full py-1 text-center text-[10px] text-landing-tan">
            Show 5 more
          </p>
        </div>
      </div>
    </div>
  );
}
