import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bar } from '../entities/bar.entity.js';
import { BarPhoto } from '../entities/bar-photo.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { BarStatus, SearchSortBy } from '@my-project/shared';
import { SearchBarsDto } from './dto/search-bars.dto.js';
import { extractThumbnail } from '../common/utils/photo-utils.js';

/** 검색 모드 */
type SearchMode = 'address' | 'name' | 'combined' | 'general';

interface SearchItem {
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

/**
 * 바 검색 서비스. 3가지 모드를 지원한다:
 * 1. 주소만 (lat+lng) → 근처 바 목록 + 더보기
 * 2. 이름만 (name) → 유저 위치 기준 가장 가까운 1개
 * 3. 주소+이름 (lat+lng+name) → 해당 위치에서 이름 매칭 1개
 */
@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Bar)
    private readonly barRepository: Repository<Bar>,
    @InjectRepository(Bookmark)
    private readonly bookmarkRepository: Repository<Bookmark>,
  ) {}

  /**
   * 검색 모드를 자동 판별하여 실행한다.
   */
  async search(dto: SearchBarsDto, userId?: number): Promise<SearchResult> {
    const hasLocation = dto.lat !== undefined && dto.lat !== null;
    const hasName = !!dto.name?.trim();

    if (hasLocation && hasName) {
      return this.searchCombined(dto, userId);
    }
    if (hasLocation) {
      return this.searchByAddress(dto, userId);
    }
    if (hasName) {
      return this.searchByName(dto, userId);
    }

    // 일반 목록 모드 (홈페이지 인기/최신 바 등)
    return this.searchGeneral(dto, userId);
  }

  /**
   * Mode 1: 주소만 검색. 지정 좌표 근처 바를 거리순으로 반환한다.
   */
  private async searchByAddress(dto: SearchBarsDto, userId?: number): Promise<SearchResult> {
    const { lat, lng, radiusKm = 5, limit = 5, offset = 0 } = dto;

    const params: unknown[] = [lat, lng, radiusKm! * 1000, limit + 1, offset, userId ?? null];
    const userIdIdx = 6;

    const rows: SearchItem[] = await this.barRepository.query(
      `SELECT b.id, b.name, b.address, b.city, b.country, b.latitude, b.longitude,
        ROUND(CAST(
          ST_Distance(
            b.location,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
          ) / 1000 AS numeric
        ), 1) AS "distanceKm",
        (SELECT bp.url FROM bar_photos bp WHERE bp."barId" = b.id AND bp."deletedAt" IS NULL ORDER BY bp."order" ASC LIMIT 1) AS thumbnail,
        (SELECT COUNT(*)::int FROM bookmarks bm WHERE bm."barId" = b.id AND bm."deletedAt" IS NULL) AS "bookmarkCount",
        CASE WHEN $${userIdIdx}::int IS NOT NULL
          THEN EXISTS(SELECT 1 FROM bookmarks bm WHERE bm."barId" = b.id AND bm."userId" = $${userIdIdx}::int AND bm."deletedAt" IS NULL)
          ELSE false
        END AS "isBookmarked",
        COALESCE(brs."ratingAvg", 0)::float AS "averageRating",
        COALESCE(brs."reviewCount", 0)::int AS "reviewCount"
      FROM bars b
      LEFT JOIN bar_review_stats brs ON brs."barId" = b.id
      WHERE b.status = 'APPROVED' AND b."deletedAt" IS NULL
        AND ST_DWithin(
          b.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3
        )
      ORDER BY "distanceKm" ASC
      LIMIT $4 OFFSET $5`,
      params,
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(this.mapRow);

    return {
      items,
      hasMore,
      mode: 'address',
      center: { lat: lat!, lng: lng! },
      radiusKm,
    };
  }

  /**
   * Mode 2: 이름 검색. 후보 목록을 반환한다. 좌표가 있으면 거리순 정렬 추가.
   */
  private async searchByName(dto: SearchBarsDto, userId?: number): Promise<SearchResult> {
    const { name, userLat, userLng, limit = 5, offset = 0 } = dto;
    const trimmedName = name!.trim();
    const hasCoords = userLat != null && userLng != null;

    const params: unknown[] = hasCoords
      ? [trimmedName, userLat, userLng, userId ?? null, limit + 1, offset]
      : [trimmedName, userId ?? null, limit + 1, offset];

    const userIdIdx = hasCoords ? 4 : 2;
    const limitIdx = hasCoords ? 5 : 3;
    const offsetIdx = hasCoords ? 6 : 4;

    const distanceSelect = hasCoords
      ? `ROUND(CAST(
          ST_Distance(
            b.location,
            ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography
          ) / 1000 AS numeric
        ), 1) AS "distanceKm",`
      : `NULL::numeric AS "distanceKm",`;

    const orderClause = hasCoords
      ? `ORDER BY "similarityScore" DESC, "distanceKm" ASC`
      : `ORDER BY "similarityScore" DESC`;

    const rows: SearchItem[] = await this.barRepository.query(
      `SELECT b.id, b.name, b.address, b.city, b.country, b.latitude, b.longitude,
        similarity(b.name, $1) AS "similarityScore",
        ${distanceSelect}
        (SELECT bp.url FROM bar_photos bp WHERE bp."barId" = b.id AND bp."deletedAt" IS NULL ORDER BY bp."order" ASC LIMIT 1) AS thumbnail,
        (SELECT COUNT(*)::int FROM bookmarks bm WHERE bm."barId" = b.id AND bm."deletedAt" IS NULL) AS "bookmarkCount",
        CASE WHEN $${userIdIdx}::int IS NOT NULL
          THEN EXISTS(SELECT 1 FROM bookmarks bm WHERE bm."barId" = b.id AND bm."userId" = $${userIdIdx}::int AND bm."deletedAt" IS NULL)
          ELSE false
        END AS "isBookmarked",
        COALESCE(brs."ratingAvg", 0)::float AS "averageRating",
        COALESCE(brs."reviewCount", 0)::int AS "reviewCount"
      FROM bars b
      LEFT JOIN bar_review_stats brs ON brs."barId" = b.id
      WHERE b.status = 'APPROVED' AND b."deletedAt" IS NULL
        AND similarity(b.name, $1) > 0.2
      ${orderClause}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(this.mapRow);

    return {
      items,
      hasMore,
      mode: 'name',
    };
  }

  /**
   * Mode 3: 주소+이름 복합 검색. 지정 좌표 근처에서 이름 매칭 후보 목록을 반환한다.
   */
  private async searchCombined(dto: SearchBarsDto, userId?: number): Promise<SearchResult> {
    const { name, lat, lng, radiusKm = 5, limit = 5, offset = 0 } = dto;
    const trimmedName = name!.trim();

    const params: unknown[] = [trimmedName, lat, lng, radiusKm * 1000, userId ?? null, limit + 1, offset];
    const userIdIdx = 5;

    const rows: SearchItem[] = await this.barRepository.query(
      `SELECT b.id, b.name, b.address, b.city, b.country, b.latitude, b.longitude,
        similarity(b.name, $1) AS "similarityScore",
        ROUND(CAST(
          ST_Distance(
            b.location,
            ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography
          ) / 1000 AS numeric
        ), 1) AS "distanceKm",
        (SELECT bp.url FROM bar_photos bp WHERE bp."barId" = b.id AND bp."deletedAt" IS NULL ORDER BY bp."order" ASC LIMIT 1) AS thumbnail,
        (SELECT COUNT(*)::int FROM bookmarks bm WHERE bm."barId" = b.id AND bm."deletedAt" IS NULL) AS "bookmarkCount",
        CASE WHEN $${userIdIdx}::int IS NOT NULL
          THEN EXISTS(SELECT 1 FROM bookmarks bm WHERE bm."barId" = b.id AND bm."userId" = $${userIdIdx}::int AND bm."deletedAt" IS NULL)
          ELSE false
        END AS "isBookmarked",
        COALESCE(brs."ratingAvg", 0)::float AS "averageRating",
        COALESCE(brs."reviewCount", 0)::int AS "reviewCount"
      FROM bars b
      LEFT JOIN bar_review_stats brs ON brs."barId" = b.id
      WHERE b.status = 'APPROVED' AND b."deletedAt" IS NULL
        AND ST_DWithin(
          b.location,
          ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
          $4
        )
        AND similarity(b.name, $1) > 0.2
      ORDER BY "similarityScore" DESC, "distanceKm" ASC
      LIMIT $6 OFFSET $7`,
      params,
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(this.mapRow);

    return {
      items,
      hasMore,
      mode: 'combined',
      center: { lat: lat!, lng: lng! },
      radiusKm,
    };
  }

  /**
   * 일반 목록 모드. sortBy 기준으로 바를 반환한다 (홈페이지 호환).
   */
  private async searchGeneral(dto: SearchBarsDto, userId?: number): Promise<SearchResult> {
    const { limit = 5, offset = 0, sortBy = SearchSortBy.NEWEST } = dto;

    const qb = this.barRepository
      .createQueryBuilder('bar')
      .where('bar.status = :status', { status: BarStatus.APPROVED });

    // 사진 조인 (썸네일용)
    qb.leftJoin('bar.photos', 'photo');
    qb.addSelect(['photo.url', 'photo.order']);

    // 리뷰 통계 조인
    qb.leftJoin('bar.reviewStats', 'reviewStats');
    qb.addSelect(['reviewStats.ratingAvg', 'reviewStats.reviewCount']);

    // 북마크 카운트
    qb.loadRelationCountAndMap('bar.bookmarkCount', 'bar.bookmarks');

    // isBookmarked 서브쿼리 (인증 유저인 경우)
    if (userId) {
      qb.addSelect((subQuery) => {
        return subQuery
          .select('CASE WHEN COUNT(*) > 0 THEN true ELSE false END')
          .from('bookmarks', 'ubm')
          .where('ubm."barId" = bar.id')
          .andWhere('ubm."userId" = :bmUserId')
          .andWhere('ubm."deletedAt" IS NULL');
      }, 'is_bookmarked');
      qb.setParameter('bmUserId', userId);
    }

    switch (sortBy) {
      case SearchSortBy.BOOKMARKS:
        qb.addSelect((subQuery) => {
          return subQuery
            .select('COUNT(bm.id)', 'bmCount')
            .from('bookmarks', 'bm')
            .where('bm."barId" = bar.id');
        }, 'bookmark_count_sort');
        qb.orderBy('bookmark_count_sort', 'DESC');
        break;
      case SearchSortBy.RELEVANCE:
      case SearchSortBy.NEWEST:
      default:
        qb.orderBy('bar.createdAt', 'DESC');
        break;
    }

    qb.skip(offset);
    qb.take(limit);

    const totalItems = await qb.getCount();
    const { entities, raw } = await qb.getRawAndEntities();

    const mappedItems = entities.map((bar, idx) => {
      const barWithExtras = bar as Bar & {
        photos?: BarPhoto[];
        bookmarkCount?: number;
        reviewStats?: { ratingAvg: number | string | null; reviewCount: number | null };
      };
      const photos = barWithExtras.photos || [];
      const thumbnail = extractThumbnail(photos);

      return {
        id: bar.id,
        name: bar.name,
        address: bar.address,
        city: bar.city,
        country: bar.country,
        latitude: bar.latitude,
        longitude: bar.longitude,
        thumbnail,
        bookmarkCount: barWithExtras.bookmarkCount ?? 0,
        isBookmarked: userId ? Boolean(raw[idx]?.is_bookmarked) : false,
        averageRating: barWithExtras.reviewStats ? Number(barWithExtras.reviewStats.ratingAvg) || 0 : 0,
        reviewCount: barWithExtras.reviewStats?.reviewCount ?? 0,
      };
    });

    return {
      items: mappedItems,
      hasMore: totalItems > offset + limit,
      mode: 'general',
    };
  }

  /** raw query 결과를 SearchItem으로 정규화한다 */
  private mapRow(row: SearchItem): SearchItem {
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
}
