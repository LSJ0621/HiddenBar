/** 인용문 + 수치 카운터 풀너비 밴드 섹션 */
export function SocialProof() {
  const stats = [
    { value: '150+', label: 'Bars Listed', className: 'text-landing-amber text-neon-glow' },
    { value: '30+', label: 'Cities Covered', className: 'text-landing-teal' },
    { value: '500+', label: 'Reviews Written', className: 'text-landing-cream' },
  ];

  return (
    <section className="border-y border-landing-brown/10 bg-[#080402] py-16 md:py-24">
      <div className="mx-auto max-w-[1080px] px-6 md:px-8">
        {/* 인용문 */}
        <div className="mb-12 text-center md:mb-16">
          <p className="font-display text-2xl font-light leading-snug text-landing-cream md:text-3xl lg:text-4xl">
            &ldquo;The best bars don&apos;t have signs.
            <br className="hidden sm:block" />
            That&apos;s why we built the map.&rdquo;
          </p>
          <p className="mt-4 font-mono text-[9px] tracking-[0.3em] uppercase text-landing-amber">
            &mdash; Hidden Bar
          </p>
        </div>

        {/* 수치 카운터 */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`font-display text-3xl md:text-4xl lg:text-5xl ${stat.className}`}>
                {stat.value}
              </p>
              <p className="mt-2 font-mono text-[9px] tracking-[0.2em] uppercase text-landing-tan">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
