import { Review } from '../entities/review.entity.js';
import { BarReviewStats } from '../entities/bar-review-stats.entity.js';

/**
 * Review 엔티티를 프론트엔드 ReviewItem 형태로 변환한다.
 */
export function toReviewItem(review: Review) {
  return {
    id: review.id,
    rating: review.rating,
    content: review.content,
    visitedAt: review.visitedAt,
    status: review.status,
    author: review.user
      ? {
          id: review.user.id,
          name: review.user.name,
          profileImageUrl: review.user.profileImage,
        }
      : null,
    photos: (review.photos || []).map((photo) => ({
      id: photo.id,
      url: photo.url,
      sortOrder: photo.sortOrder,
    })),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

/**
 * BarReviewStats를 프론트엔드 ReviewStats 형태로 변환한다.
 */
export function toReviewStats(stats: BarReviewStats | null) {
  if (!stats) {
    return {
      totalCount: 0,
      averageRating: 0,
      distribution: [1, 2, 3, 4, 5].map((r) => ({ rating: r, count: 0 })),
    };
  }
  return {
    totalCount: stats.reviewCount,
    averageRating: Number(stats.ratingAvg),
    distribution: [
      { rating: 1, count: stats.rating1Count },
      { rating: 2, count: stats.rating2Count },
      { rating: 3, count: stats.rating3Count },
      { rating: 4, count: stats.rating4Count },
      { rating: 5, count: stats.rating5Count },
    ],
  };
}
