import { RefreshCw } from 'lucide-react';

/**
 * 길안내 기능(Feature 03)의 정적 UI 목업 컴포넌트.
 * Walking / Transit / Driving 이동 수단 선택과 경로 단계 목록을 재현한다.
 */
export function DirectionsMockup() {
  return (
    <div className="select-none rounded-tl-2xl rounded-br border border-landing-brown/15 bg-landing-charcoal p-5 md:p-6">
      {/* 목적지 헤더 */}
      <p className="mb-3 text-sm font-semibold text-landing-cream">
        Directions to The Alchemist
      </p>

      {/* TravelModeSelector — ToggleGroup 정적 재현 */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex rounded-md border border-landing-brown/15">
          {['Walking', 'Transit', 'Driving'].map((mode, i) => (
            <div
              key={mode}
              className={`px-3 py-1.5 text-xs ${
                mode === 'Walking'
                  ? 'bg-landing-amber/15 text-landing-amber'
                  : 'text-landing-tan'
              } ${i > 0 ? 'border-l border-landing-brown/15' : ''} ${
                i === 0 ? 'rounded-l-md' : ''
              } ${i === 2 ? 'rounded-r-md' : ''}`}
            >
              {mode}
            </div>
          ))}
        </div>
        <div className="flex size-8 items-center justify-center rounded-md text-landing-tan">
          <RefreshCw className="size-3.5" />
        </div>
      </div>

      {/* DirectionsInfo — 거리 + 시간 */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="font-medium text-landing-cream">1.2 km</span>
        <span className="font-medium text-landing-cream">15 min</span>
      </div>

      {/* Step list */}
      <ol className="space-y-2.5">
        {[
          'Head south on Sukhumvit Rd',
          'Turn left at Soi 11',
          'Destination will be on your right',
        ].map((step, i) => (
          <li key={i} className="flex gap-2.5 text-xs">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-landing-deep text-[10px] font-medium text-landing-tan">
              {i + 1}
            </span>
            <span className="text-landing-cream">{step}</span>
          </li>
        ))}
      </ol>

      {/* 출발/도착 시각화 */}
      <div className="mt-4 flex items-center gap-3 border-t border-landing-brown/10 pt-4">
        <div className="flex flex-col items-center gap-1">
          <div className="size-2.5 rounded-full border-2 border-landing-teal bg-landing-teal/20" />
          <div className="h-6 w-px bg-gradient-to-b from-landing-teal to-landing-amber" />
          <div className="size-2.5 rounded-full border-2 border-landing-amber bg-landing-amber/20" />
        </div>
        <div className="flex-1 space-y-3">
          <p className="text-xs text-landing-cream">Your Location</p>
          <p className="text-xs text-landing-amber">The Alchemist</p>
        </div>
      </div>
    </div>
  );
}
