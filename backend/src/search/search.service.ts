import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bar } from '../entities/bar.entity.js';
import { BarPhoto } from '../entities/bar-photo.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import { BarStatus, SearchSortBy } from '@my-project/shared';
import { SearchBarsDto } from './dto/search-bars.dto.js';
import { extractThumbnail } from '../common/utils/photo-utils.js';
import type { SearchItem, SearchResult } from './search.types.js';
import { mapSearchRow } from './search.mapper.js';

/**
 * pg_trgm similarity 일치 임계값.
 * `%` 연산자는 세션 GUC `pg_trgm.similarity_threshold` 를 기준으로 동작하므로,
 * 검색 실행 트랜잭션에서 `SET LOCAL pg_trgm.similarity_threshold = <이 값>` 으로 동기화한다.
 */
const SEARCH_SIMILARITY_THRESHOLD = 0.2;

/**
 * 자동완성 분기 임계값. 입력 길이 < 4 자 이면 pg_trgm `%` 대신
 * `lower(name) LIKE 'xx%'` B-tree prefix 경로로 전환한다.
 * Phase 2 측정: 2-3자 prefix 는 pg_trgm 후보가 20k+ 행 까지 팽창해 Bitmap Heap Recheck
 * 가 힙 페이지를 경합시키는 병목이 됨. 짧은 입력의 오타 내성(fuzzy) 은 의도적으로 포기.
 */
const AUTOCOMPLETE_PREFIX_THRESHOLD = 4;

/**
 * LIKE 패턴의 메타문자(`\`, `%`, `_`) 를 이스케이프한다.
 * 반환 문자열은 항상 `ESCAPE '\'` 절과 함께 사용해야 한다.
 */
function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** 3개 raw-SQL 검색 메서드 공통 SELECT 컬럼 */
const COMMON_SELECT = `b.id, b.name, b.address, b.city, b.country, b.latitude, b.longitude,
        (SELECT bp.url FROM bar_photos bp WHERE bp."barId" = b.id AND bp."deletedAt" IS NULL ORDER BY bp."order" ASC LIMIT 1) AS thumbnail,
        (SELECT COUNT(*)::int FROM bookmarks bm WHERE bm."barId" = b.id AND bm."deletedAt" IS NULL) AS "bookmarkCount",`;

/** 공통 FROM + JOIN + WHERE (approved & not deleted) */
const COMMON_FROM = `FROM bars b
      LEFT JOIN bar_review_stats brs ON brs."barId" = b.id
      WHERE b.status = 'APPROVED' AND b."deletedAt" IS NULL`;

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
   * isBookmarked CASE 절을 생성한다.
   */
  private buildIsBookmarkedClause(userIdIdx: number): string {
    return `CASE WHEN $${userIdIdx}::int IS NOT NULL
          THEN EXISTS(SELECT 1 FROM bookmarks bm WHERE bm."barId" = b.id AND bm."userId" = $${userIdIdx}::int AND bm."deletedAt" IS NULL)
          ELSE false
        END AS "isBookmarked",
        COALESCE(brs."ratingAvg", 0)::float AS "averageRating",
        COALESCE(brs."reviewCount", 0)::int AS "reviewCount"`;
  }

  /**
   * Mode 1: 주소만 검색. 지정 좌표 근처 바를 거리순으로 반환한다.
   */
  private async searchByAddress(dto: SearchBarsDto, userId?: number): Promise<SearchResult> {
    const { lat, lng, radiusKm = 5, limit = 5, offset = 0 } = dto;

    const params: unknown[] = [lat, lng, radiusKm! * 1000, limit + 1, offset, userId ?? null];
    const userIdIdx = 6;

    const rows: SearchItem[] = await this.barRepository.query(
      `SELECT ${COMMON_SELECT}
        ROUND(CAST(
          ST_Distance(
            b.location,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
          ) / 1000 AS numeric
        ), 1) AS "distanceKm",
        ${this.buildIsBookmarkedClause(userIdIdx)}
      ${COMMON_FROM}
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
    const items = rows.slice(0, limit).map(mapSearchRow);

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

    const distanceSelect = hasCoords
      ? `ROUND(CAST(
          ST_Distance(
            b.location,
            ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography
          ) / 1000 AS numeric
        ), 1) AS "distanceKm",`
      : `NULL::numeric AS "distanceKm",`;

    // 짧은 prefix(<4자) 는 B-tree `lower(name) LIKE 'xx%'` 경로로 전환.
    // idx_bar_name_lower_prefix(varchar_pattern_ops) 가 범위 스캔으로 적중.
    if (trimmedName.length < AUTOCOMPLETE_PREFIX_THRESHOLD) {
      const likePattern = `${escapeLikePattern(trimmedName.toLowerCase())}%`;
      const params: unknown[] = hasCoords
        ? [likePattern, userLat, userLng, userId ?? null, limit + 1, offset]
        : [likePattern, userId ?? null, limit + 1, offset];
      const userIdIdx = hasCoords ? 4 : 2;
      const limitIdx = hasCoords ? 5 : 3;
      const offsetIdx = hasCoords ? 6 : 4;
      const orderClause = hasCoords
        ? `ORDER BY lower(b.name) ASC, "distanceKm" ASC`
        : `ORDER BY lower(b.name) ASC`;

      const rows: SearchItem[] = await this.barRepository.query(
        `SELECT ${COMMON_SELECT}
            NULL::float AS "similarityScore",
            ${distanceSelect}
            ${this.buildIsBookmarkedClause(userIdIdx)}
          ${COMMON_FROM}
            AND lower(b.name) LIKE $1 ESCAPE '\\'
          ${orderClause}
          LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      );

      return {
        items: rows.slice(0, limit).map(mapSearchRow),
        hasMore: rows.length > limit,
        mode: 'name',
      };
    }

    // 4자+ 경로: pg_trgm `%` + similarity 정렬. 세션 threshold 를 먼저 set 한 뒤 동일 트랜잭션에서 조회.
    const params: unknown[] = hasCoords
      ? [trimmedName, userLat, userLng, userId ?? null, limit + 1, offset]
      : [trimmedName, userId ?? null, limit + 1, offset];
    const userIdIdx = hasCoords ? 4 : 2;
    const limitIdx = hasCoords ? 5 : 3;
    const offsetIdx = hasCoords ? 6 : 4;
    const orderClause = hasCoords
      ? `ORDER BY "similarityScore" DESC, "distanceKm" ASC`
      : `ORDER BY "similarityScore" DESC`;

    const rows: SearchItem[] = await this.barRepository.manager.transaction(
      async (mgr) => {
        await mgr.query(
          `SET LOCAL pg_trgm.similarity_threshold = ${SEARCH_SIMILARITY_THRESHOLD}`,
        );
        return mgr.query(
          `SELECT ${COMMON_SELECT}
            similarity(b.name, $1) AS "similarityScore",
            ${distanceSelect}
            ${this.buildIsBookmarkedClause(userIdIdx)}
          ${COMMON_FROM}
            AND b.name % $1
          ${orderClause}
          LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
          params,
        );
      },
    );

    return {
      items: rows.slice(0, limit).map(mapSearchRow),
      hasMore: rows.length > limit,
      mode: 'name',
    };
  }

  /**
   * Mode 3: 주소+이름 복합 검색. 지정 좌표 근처에서 이름 매칭 후보 목록을 반환한다.
   */
  private async searchCombined(dto: SearchBarsDto, userId?: number): Promise<SearchResult> {
    const { name, lat, lng, radiusKm = 5, limit = 5, offset = 0 } = dto;
    const trimmedName = name!.trim();
    const userIdIdx = 5;

    const distanceSelect = `ROUND(CAST(
              ST_Distance(
                b.location,
                ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography
              ) / 1000 AS numeric
            ), 1) AS "distanceKm",`;
    const geoFilter = `AND ST_DWithin(
              b.location,
              ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
              $4
            )`;

    // 짧은 prefix(<4자) 경로: searchByName과 동일하게 B-tree LIKE 로 전환.
    // ST_DWithin GIST 경로는 양쪽 모두 유지.
    let rows: SearchItem[];
    if (trimmedName.length < AUTOCOMPLETE_PREFIX_THRESHOLD) {
      const likePattern = `${escapeLikePattern(trimmedName.toLowerCase())}%`;
      const params: unknown[] = [likePattern, lat, lng, radiusKm * 1000, userId ?? null, limit + 1, offset];
      rows = await this.barRepository.query(
        `SELECT ${COMMON_SELECT}
            NULL::float AS "similarityScore",
            ${distanceSelect}
            ${this.buildIsBookmarkedClause(userIdIdx)}
          ${COMMON_FROM}
            ${geoFilter}
            AND lower(b.name) LIKE $1 ESCAPE '\\'
          ORDER BY lower(b.name) ASC, "distanceKm" ASC
          LIMIT $6 OFFSET $7`,
        params,
      );
    } else {
      // 4자+ 경로: pg_trgm `%` + similarity 정렬 (기존 Phase 2 동작).
      const params: unknown[] = [trimmedName, lat, lng, radiusKm * 1000, userId ?? null, limit + 1, offset];
      rows = await this.barRepository.manager.transaction(async (mgr) => {
        await mgr.query(
          `SET LOCAL pg_trgm.similarity_threshold = ${SEARCH_SIMILARITY_THRESHOLD}`,
        );
        return mgr.query(
          `SELECT ${COMMON_SELECT}
            similarity(b.name, $1) AS "similarityScore",
            ${distanceSelect}
            ${this.buildIsBookmarkedClause(userIdIdx)}
          ${COMMON_FROM}
            ${geoFilter}
            AND b.name % $1
          ORDER BY "similarityScore" DESC, "distanceKm" ASC
          LIMIT $6 OFFSET $7`,
          params,
        );
      });
    }

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(mapSearchRow);

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
}
