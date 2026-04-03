import type { SearchItem } from './search.types.js';

/**
 * raw query 결과를 SearchItem으로 정규화한다.
 */
export function mapSearchRow(row: SearchItem): SearchItem {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    thumbnail: row.thumbnail,
    bookmarkCount: Number(row.bookmarkCount) || 0,
    isBookmarked: Boolean(row.isBookmarked),
    averageRating: Number(row.averageRating) || 0,
    reviewCount: Number(row.reviewCount) || 0,
    ...(row.distanceKm != null ? { distanceKm: Number(row.distanceKm) } : {}),
    ...(row.similarityScore != null ? { similarityScore: Number(row.similarityScore) } : {}),
  };
}
