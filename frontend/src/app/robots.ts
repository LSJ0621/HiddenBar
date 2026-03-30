/** 검색엔진 크롤링 제어. admin 경로는 인덱싱에서 제외한다. */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hiddenbar.app'}/sitemap.xml`,
  };
}
