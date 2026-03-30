/** 검색 모드 */
export type SearchMode = 'address' | 'name' | 'combined' | 'general';

/** Bar summary for search results */
export interface BarSummary {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  thumbnail: string | null;
  bookmarkCount: number;
  isBookmarked: boolean;
  averageRating: number;
  reviewCount: number;
  distanceKm?: number;
  similarityScore?: number;
}

/** Nearby bar with distance */
export interface NearbyBar {
  id: number;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  thumbnail: string | null;
  distanceKm: number;
  averageRating: number;
  reviewCount: number;
}

/** Search API response */
export interface SearchResponse {
  items: BarSummary[];
  hasMore: boolean;
  mode: SearchMode;
  center?: { lat: number; lng: number };
  radiusKm?: number;
}

/** Nearby bars API response */
export interface NearbyResponse {
  items: NearbyBar[];
  center: { lat: number; lng: number };
  radiusKm: number;
}

/** 북마크 추가/제거 API 응답 */
export interface BookmarkToggleResponse {
  isBookmarked: boolean;
  bookmarkCount: number;
}

/** Legacy search params (홈페이지 호환) */
export interface LegacySearchParams {
  sortBy?: string | null;
  limit?: number | null;
  offset?: number | null;
}

/** Search query hook parameters */
export interface SearchParams {
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
  userLat?: number | null;
  userLng?: number | null;
  radiusKm?: number | null;
  limit?: number | null;
  offset?: number | null;
}
