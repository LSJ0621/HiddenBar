import Image from 'next/image';
import { Star, Pencil, Camera } from 'lucide-react';

/**
 * 북마크 & 리뷰 기능(Feature 04)의 정적 UI 목업 컴포넌트.
 * 북마크 목록과 리뷰 작성 미니 UI를 재현한다.
 */
export function BookmarkMockup() {
  const bookmarks = [
    { name: 'The Alchemist', city: 'Bangkok', country: 'Thailand', rating: 4.2, reviews: 28, date: '2 days ago', img: '/images/mockup/cocktail-1.jpg' },
    { name: 'Rabbit Hole', city: 'Singapore', country: 'Singapore', rating: 4.5, reviews: 42, date: '1 week ago', img: '/images/mockup/cocktail-2.jpg' },
    { name: 'Iron Fairies', city: 'Bangkok', country: 'Thailand', rating: 4.0, reviews: 15, date: '2 weeks ago', img: '/images/mockup/bar-shelf.jpg' },
  ];

  return (
    <div className="select-none rounded-tl-2xl rounded-br border border-landing-brown/15 bg-landing-charcoal p-5 md:p-6">
      {/* 페이지 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <p className="font-display text-lg text-landing-cream">My Bookmarks</p>
          <span className="text-xs text-landing-tan">3</span>
        </div>
        <div className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-landing-tan">
          <Pencil className="size-3" />
          Edit
        </div>
      </div>

      {/* 북마크 리스트 */}
      <div className="divide-y divide-landing-brown/8">
        {bookmarks.map((bar) => (
          <div
            key={bar.name}
            className="flex items-center gap-3 border-l-2 border-l-transparent py-3 pl-2"
          >
            {/* Thumbnail */}
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-landing-deep">
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
              <p className="truncate text-xs font-semibold text-landing-cream">{bar.name}</p>
              <div className="flex items-center gap-1.5">
                <Star className="size-3 fill-landing-amber text-landing-amber" />
                <span className="text-[10px] font-medium text-landing-cream">{bar.rating}</span>
                <span className="text-[10px] text-landing-tan">({bar.reviews})</span>
              </div>
              <p className="text-[10px] text-landing-tan">{bar.city}, {bar.country}</p>
              <p className="text-[10px] text-landing-tan">Bookmarked {bar.date}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 리뷰 작성 미니 UI */}
      <div className="mt-4 border-t border-landing-brown/10 pt-3">
        <p className="mb-2 text-[10px] font-semibold text-landing-cream">
          Write a Review
        </p>
        <div className="mb-2 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`size-4 ${
                i <= 4
                  ? 'fill-landing-amber text-landing-amber'
                  : 'text-landing-brown/30'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-md border border-landing-brown/15 bg-landing-dark px-3 py-2">
            <span className="text-xs text-landing-tan">Amazing atmosphere...</span>
          </div>
          <div className="flex size-8 items-center justify-center rounded-md bg-landing-brown/10">
            <Camera className="size-3.5 text-landing-tan" />
          </div>
        </div>
      </div>
    </div>
  );
}
