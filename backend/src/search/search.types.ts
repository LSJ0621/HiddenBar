/** 검색 모드 */
export type SearchMode = 'address' | 'name' | 'combined' | 'general';

export interface SearchItem {
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

export interface SearchResult {
  items: SearchItem[];
  hasMore: boolean;
  mode: SearchMode;
  center?: { lat: number; lng: number };
  radiusKm?: number;
}
