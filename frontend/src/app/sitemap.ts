const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hiddenbar.app';

/** 정적 + 동적 페이지를 포함하는 사이트맵 */
export default function sitemap() {
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8 },
  ];
}
