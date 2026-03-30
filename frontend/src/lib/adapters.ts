import type { BarSummary, NearbyBar } from '@/types';

/** Convert NearbyBar to BarSummary for BarCard compatibility */
export function nearbyBarToSummary(bar: NearbyBar, includeDistance = false): BarSummary {
  return {
    id: bar.id,
    name: bar.name,
    address: bar.address,
    city: includeDistance && bar.distanceKm != null
      ? `${bar.distanceKm.toFixed(1)}km · ${bar.city}`
      : bar.city,
    country: '',
    latitude: bar.latitude,
    longitude: bar.longitude,
    thumbnail: bar.thumbnail,
    bookmarkCount: 0,
    isBookmarked: false,
    averageRating: bar.averageRating,
    reviewCount: bar.reviewCount,
  };
}
