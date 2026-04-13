import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { Bar } from '../entities/bar.entity.js';
import { Bookmark } from '../entities/bookmark.entity.js';
import {
  BarStatus,
  SearchSortBy,
} from '@my-project/shared';
import { SearchBarsDto } from './dto/search-bars.dto.js';

/**
 * QueryBuilder mock 체인 헬퍼 (general 모드용).
 * getCount + getRawAndEntities 방식을 사용하는 최신 구현에 맞게 업데이트됨.
 */
function createMockQueryBuilder(items: any[] = [], totalItems = 0) {
  const qb: Record<string, jest.Mock> = {};
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.leftJoin = jest.fn().mockReturnValue(qb);
  qb.addSelect = jest.fn().mockReturnValue(qb);
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.addOrderBy = jest.fn().mockReturnValue(qb);
  qb.skip = jest.fn().mockReturnValue(qb);
  qb.take = jest.fn().mockReturnValue(qb);
  qb.setParameter = jest.fn().mockReturnValue(qb);
  qb.loadRelationCountAndMap = jest.fn().mockReturnValue(qb);
  // 레거시 호환용 (이전 구현)
  qb.getManyAndCount = jest.fn().mockResolvedValue([items, totalItems]);
  // 최신 구현: getCount + getRawAndEntities 분리 방식
  qb.getCount = jest.fn().mockResolvedValue(totalItems);
  // raw 배열은 entities와 동일한 수 — isBookmarked 플래그 포함
  qb.getRawAndEntities = jest.fn().mockResolvedValue({
    entities: items,
    raw: items.map((item) => ({
      bar_id: item.id,
      is_bookmarked: item.isBookmarked ?? false,
    })),
  });
  return qb;
}

/** raw SQL 결과 행 헬퍼 */
function makeRawRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    name: 'The Secret Bar',
    address: '123 Sukhumvit Rd',
    city: 'Bangkok',
    country: 'Thailand',
    latitude: 13.7563,
    longitude: 100.5018,
    thumbnail: 'https://example.com/photo1.jpg',
    bookmarkCount: 42,
    distanceKm: 1.2,
    averageRating: 0,
    reviewCount: 0,
    ...overrides,
  };
}

/** general 모드용 Bar 엔티티 유사 객체 */
const mockBarEntity = {
  id: 1,
  name: 'The Secret Bar',
  address: '123 Sukhumvit Rd',
  city: 'Bangkok',
  country: 'Thailand',
  latitude: 13.7563,
  longitude: 100.5018,
  status: BarStatus.APPROVED,
  photos: [{ url: 'https://example.com/photo1.jpg', order: 0 }],
  bookmarkCount: 42,
  createdAt: new Date('2026-01-01'),
};

describe('SearchService', () => {
  let service: SearchService;
  let barRepo: {
    query: jest.Mock;
    createQueryBuilder: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  /** BookmarkRepository mock — isBookmarked 구현 시 SearchService가 사용할 의존성 */
  let bookmarkRepo: {
    query: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    const barRepoQuery = jest.fn();
    barRepo = {
      query: barRepoQuery,
      createQueryBuilder: jest.fn(),
      // name/combined 모드의 raw 쿼리는 transaction 안에서 `SET LOCAL pg_trgm.similarity_threshold`
      // 를 먼저 실행하므로, 테스트에서는 manager.transaction 이 콜백을 즉시 실행하도록 목한다.
      // 콜백에 넘어가는 `mgr.query` 는 동일 jest.fn 이라 기존 assertion 이 재사용 가능하다.
      manager: {
        transaction: jest.fn(async (cb: (mgr: { query: jest.Mock }) => Promise<unknown>) =>
          cb({ query: barRepoQuery }),
        ),
      },
    };

    bookmarkRepo = {
      query: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(Bar), useValue: barRepo },
        { provide: getRepositoryToken(Bookmark), useValue: bookmarkRepo },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  // ───────────────────────────────────────────────
  // 1. 모드 판별
  // ───────────────────────────────────────────────
  describe('mode detection', () => {
    it('lat+lng+name 제공 시 combined 모드로 실행한다', async () => {
      barRepo.query.mockResolvedValue([]);

      const result = await service.search({
        lat: 13.75,
        lng: 100.5,
        name: 'Secret',
      });

      expect(result.mode).toBe('combined');
      // combined/name 모드는 SET LOCAL + 본 쿼리로 mgr.query가 2회 호출된다.
      expect(barRepo.query).toHaveBeenCalled();
    });

    it('lat+lng만 제공 시 address 모드로 실행한다', async () => {
      barRepo.query.mockResolvedValue([]);

      const result = await service.search({ lat: 13.75, lng: 100.5 });

      expect(result.mode).toBe('address');
      expect(barRepo.query).toHaveBeenCalledTimes(1);
    });

    it('name만 제공 시 name 모드로 실행한다', async () => {
      barRepo.query.mockResolvedValue([]);

      const result = await service.search({
        name: 'Secret',
        userLat: 13.75,
        userLng: 100.5,
      });

      expect(result.mode).toBe('name');
      expect(barRepo.query).toHaveBeenCalled();
    });

    it('name, lat, lng 모두 없으면 general 모드(QueryBuilder)로 실행한다', async () => {
      const qb = createMockQueryBuilder([], 0);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search({});

      expect(result.mode).toBe('general');
      expect(barRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(barRepo.query).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────
  // 2. Address 모드
  // ───────────────────────────────────────────────
  describe('address mode', () => {
    it('올바른 SQL 파라미터를 전달한다', async () => {
      barRepo.query.mockResolvedValue([]);

      await service.search({
        lat: 13.75,
        lng: 100.5,
        radiusKm: 10,
        limit: 5,
        offset: 0,
      });

      expect(barRepo.query).toHaveBeenCalledWith(
        expect.stringContaining('ST_DWithin'),
        // params: [lat, lng, radiusKm*1000, limit+1, offset, userId(null)]
        [13.75, 100.5, 10000, 6, 0, null],
      );
    });

    it('결과 개수가 limit 초과 시 hasMore=true를 반환한다', async () => {
      // limit=2이면 limit+1=3개를 요청하고, 3개 반환 시 hasMore=true
      const rows = [makeRawRow({ id: 1 }), makeRawRow({ id: 2 }), makeRawRow({ id: 3 })];
      barRepo.query.mockResolvedValue(rows);

      const result = await service.search({
        lat: 13.75,
        lng: 100.5,
        limit: 2,
      });

      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(2);
    });

    it('결과 개수가 limit 이하이면 hasMore=false를 반환한다', async () => {
      barRepo.query.mockResolvedValue([makeRawRow()]);

      const result = await service.search({
        lat: 13.75,
        lng: 100.5,
        limit: 5,
      });

      expect(result.hasMore).toBe(false);
      expect(result.items).toHaveLength(1);
    });

    it('center와 radiusKm을 응답에 포함한다', async () => {
      barRepo.query.mockResolvedValue([]);

      const result = await service.search({
        lat: 13.75,
        lng: 100.5,
        radiusKm: 10,
      });

      expect(result.center).toEqual({ lat: 13.75, lng: 100.5 });
      expect(result.radiusKm).toBe(10);
    });

    it('radiusKm 기본값은 5이다', async () => {
      barRepo.query.mockResolvedValue([]);

      await service.search({ lat: 13.75, lng: 100.5 });

      // params[2] = radiusKm * 1000 = 5000
      // userId 없이 호출하면 params[5] = null
      expect(barRepo.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([5000]),
      );
    });
  });

  // ───────────────────────────────────────────────
  // 3. Name 모드
  // ───────────────────────────────────────────────
  describe('name mode', () => {
    it('좌표 있으면 similarity + distance 기반으로 복수 결과를 반환한다', async () => {
      barRepo.query.mockResolvedValue([
        makeRawRow({ id: 1, similarityScore: 0.8 }),
        makeRawRow({ id: 2, similarityScore: 0.6 }),
      ]);

      const result = await service.search({
        name: 'Secret',
        userLat: 13.75,
        userLng: 100.5,
      });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.mode).toBe('name');
      const sql = barRepo.query.mock.calls.at(-1)![0] as string;
      expect(sql).toContain('similarity');
      expect(sql).toContain('ST_Distance');
    });

    it('좌표 없이 name만 제공 시 similarity 기반 복수 결과를 반환한다', async () => {
      barRepo.query.mockResolvedValue([
        makeRawRow({ id: 1, similarityScore: 0.9 }),
        makeRawRow({ id: 2, similarityScore: 0.7 }),
      ]);

      const result = await service.search({ name: 'Secret' });

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.mode).toBe('name');
      const sql = barRepo.query.mock.calls.at(-1)![0] as string;
      expect(sql).toContain('similarity');
      expect(sql).not.toContain('ST_Distance');
    });

    it('결과가 limit+1개면 hasMore가 true이다', async () => {
      const rows = Array.from({ length: 6 }, (_, i) =>
        makeRawRow({ id: i + 1, similarityScore: 0.8 - i * 0.1 }),
      );
      barRepo.query.mockResolvedValue(rows);

      const result = await service.search({
        name: 'Secret',
        userLat: 13.75,
        userLng: 100.5,
        limit: 5,
      });

      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });

    it('결과가 없으면 빈 배열을 반환한다', async () => {
      barRepo.query.mockResolvedValue([]);

      const result = await service.search({
        name: 'nonexistent',
        userLat: 13.75,
        userLng: 100.5,
      });

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.mode).toBe('name');
    });

    it('name 앞뒤 공백을 trim한다', async () => {
      barRepo.query.mockResolvedValue([]);

      await service.search({
        name: '  Secret  ',
        userLat: 13.75,
        userLng: 100.5,
      });

      expect(barRepo.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['Secret']),
      );
    });

    // ─── Phase 3: 짧은 prefix 분기 ───
    it('입력 길이 < 4자이면 B-tree LIKE 경로로 분기한다 (transaction/SET LOCAL 없음)', async () => {
      barRepo.query.mockResolvedValue([makeRawRow({ id: 1 })]);

      await service.search({ name: 'Ho' });

      expect(barRepo.manager.transaction).not.toHaveBeenCalled();
      const [sql, params] = barRepo.query.mock.calls[0];
      expect(sql).toContain("lower(b.name) LIKE $1 ESCAPE '\\'");
      expect(sql).not.toContain('similarity(');
      expect(sql).not.toContain('pg_trgm');
      expect(params[0]).toBe('ho%');
    });

    it('짧은 prefix 경로에서 LIKE 메타문자(%, _, \\)는 이스케이프된다', async () => {
      barRepo.query.mockResolvedValue([]);

      await service.search({ name: '%_\\' });

      const params = barRepo.query.mock.calls[0][1];
      expect(params[0]).toBe('\\%\\_\\\\%');
    });

    it('짧은 prefix + 좌표가 있으면 distance 보조 정렬이 포함된다', async () => {
      barRepo.query.mockResolvedValue([]);

      await service.search({ name: 'Ga', userLat: 13.75, userLng: 100.5 });

      const sql = barRepo.query.mock.calls[0][0] as string;
      expect(sql).toContain('ST_Distance');
      expect(sql).toContain('ORDER BY lower(b.name) ASC, "distanceKm" ASC');
    });
  });

  // ───────────────────────────────────────────────
  // 4. Combined 모드
  // ───────────────────────────────────────────────
  describe('combined mode', () => {
    it('similarity와 ST_DWithin을 모두 사용하고 복수 결과를 반환한다', async () => {
      barRepo.query.mockResolvedValue([
        makeRawRow({ id: 1, similarityScore: 0.9 }),
        makeRawRow({ id: 2, similarityScore: 0.7 }),
      ]);

      const result = await service.search({
        name: 'Secret',
        lat: 13.75,
        lng: 100.5,
        radiusKm: 5,
      });

      const sql = barRepo.query.mock.calls.at(-1)![0] as string;
      expect(sql).toContain('similarity');
      expect(sql).toContain('ST_DWithin');
      expect(result.mode).toBe('combined');
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('결과가 limit+1개면 hasMore가 true이다', async () => {
      const rows = Array.from({ length: 6 }, (_, i) =>
        makeRawRow({ id: i + 1, similarityScore: 0.9 - i * 0.1 }),
      );
      barRepo.query.mockResolvedValue(rows);

      const result = await service.search({
        name: 'Secret',
        lat: 13.75,
        lng: 100.5,
        radiusKm: 5,
        limit: 5,
      });

      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });

    it('center와 radiusKm을 응답에 포함한다', async () => {
      barRepo.query.mockResolvedValue([]);

      const result = await service.search({
        name: 'Secret',
        lat: 13.75,
        lng: 100.5,
        radiusKm: 8,
      });

      expect(result.center).toEqual({ lat: 13.75, lng: 100.5 });
      expect(result.radiusKm).toBe(8);
    });

    // ─── Phase 3: 짧은 prefix 분기 (combined) ───
    it('combined 모드에서 짧은 prefix 는 ST_DWithin + LIKE 경로로 분기한다', async () => {
      barRepo.query.mockResolvedValue([]);

      await service.search({ name: 'Ho', lat: 13.75, lng: 100.5, radiusKm: 5 });

      expect(barRepo.manager.transaction).not.toHaveBeenCalled();
      const [sql, params] = barRepo.query.mock.calls[0];
      expect(sql).toContain('ST_DWithin');
      expect(sql).toContain("lower(b.name) LIKE $1 ESCAPE '\\'");
      expect(sql).not.toContain('similarity(');
      expect(params[0]).toBe('ho%');
    });
  });

  // ───────────────────────────────────────────────
  // 5. General 모드 (홈페이지 호환)
  // ───────────────────────────────────────────────
  describe('general mode', () => {
    it('sortBy=NEWEST 시 createdAt DESC로 정렬한다', async () => {
      const qb = createMockQueryBuilder([], 0);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search({ sortBy: SearchSortBy.NEWEST });

      expect(qb.orderBy).toHaveBeenCalledWith(
        expect.stringContaining('createdAt'),
        'DESC',
      );
    });

    it('sortBy=BOOKMARKS 시 bookmark_count_sort DESC로 정렬한다', async () => {
      const qb = createMockQueryBuilder([], 0);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search({ sortBy: SearchSortBy.BOOKMARKS });

      expect(qb.orderBy).toHaveBeenCalledWith(
        'bookmark_count_sort',
        'DESC',
      );
    });

    it('sortBy 미제공 시 기본값 NEWEST로 정렬한다', async () => {
      const qb = createMockQueryBuilder([], 0);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search({});

      expect(qb.orderBy).toHaveBeenCalledWith(
        expect.stringContaining('createdAt'),
        'DESC',
      );
    });

    it('sortBy=RELEVANCE 시 createdAt DESC로 폴백한다', async () => {
      const qb = createMockQueryBuilder([], 0);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search({ sortBy: SearchSortBy.RELEVANCE });

      expect(qb.orderBy).toHaveBeenCalledWith(
        expect.stringContaining('createdAt'),
        'DESC',
      );
    });

    it('APPROVED 상태인 바만 조회한다', async () => {
      const qb = createMockQueryBuilder([], 0);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search({});

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.objectContaining({ status: BarStatus.APPROVED }),
      );
    });

    it('offset과 limit을 올바르게 전달한다', async () => {
      const qb = createMockQueryBuilder([], 0);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      await service.search({ limit: 10, offset: 20 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('totalItems > offset+limit 시 hasMore=true를 반환한다', async () => {
      const qb = createMockQueryBuilder([mockBarEntity], 50);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search({ limit: 5, offset: 0 });

      expect(result.hasMore).toBe(true);
    });

    it('totalItems <= offset+limit 시 hasMore=false를 반환한다', async () => {
      const qb = createMockQueryBuilder([mockBarEntity], 1);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search({ limit: 5, offset: 0 });

      expect(result.hasMore).toBe(false);
    });

    it('썸네일을 photos의 order 기준 첫 번째 사진에서 추출한다', async () => {
      const bar = {
        ...mockBarEntity,
        photos: [
          { url: 'https://example.com/second.jpg', order: 1 },
          { url: 'https://example.com/first.jpg', order: 0 },
        ],
      };
      const qb = createMockQueryBuilder([bar], 1);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search({});

      expect(result.items[0].thumbnail).toBe('https://example.com/first.jpg');
    });
  });

  // ───────────────────────────────────────────────
  // 6. 응답 매핑
  // ───────────────────────────────────────────────
  describe('response mapping', () => {
    it('raw SQL 결과의 bookmarkCount를 숫자로 변환한다', async () => {
      barRepo.query.mockResolvedValue([
        makeRawRow({ bookmarkCount: '15' }), // DB에서 문자열로 올 수 있음
      ]);

      const result = await service.search({ lat: 13.75, lng: 100.5 });

      expect(result.items[0].bookmarkCount).toBe(15);
      expect(typeof result.items[0].bookmarkCount).toBe('number');
    });

    it('distanceKm이 있으면 숫자로 변환하여 포함한다', async () => {
      barRepo.query.mockResolvedValue([
        makeRawRow({ distanceKm: '3.5' }),
      ]);

      const result = await service.search({ lat: 13.75, lng: 100.5 });

      expect(result.items[0].distanceKm).toBe(3.5);
    });

    it('similarityScore가 있으면 숫자로 변환하여 포함한다', async () => {
      barRepo.query.mockResolvedValue([
        makeRawRow({ similarityScore: '0.85' }),
      ]);

      const result = await service.search({
        name: 'Secret',
        userLat: 13.75,
        userLng: 100.5,
      });

      expect(result.items[0].similarityScore).toBe(0.85);
    });

    it('raw SQL 결과의 averageRating을 숫자로 정규화한다', async () => {
      // Arrange: DB에서 문자열로 올 수 있는 averageRating
      barRepo.query.mockResolvedValue([
        makeRawRow({ averageRating: '4.3' }),
      ]);

      // Act
      const result = await service.search({ lat: 13.75, lng: 100.5 });

      // Assert
      expect(typeof result.items[0].averageRating).toBe('number');
      expect(result.items[0].averageRating).toBeCloseTo(4.3);
    });

    it('raw SQL 결과의 reviewCount를 숫자로 정규화한다', async () => {
      // Arrange: DB에서 문자열로 올 수 있는 reviewCount
      barRepo.query.mockResolvedValue([
        makeRawRow({ reviewCount: '18' }),
      ]);

      // Act
      const result = await service.search({ lat: 13.75, lng: 100.5 });

      // Assert
      expect(typeof result.items[0].reviewCount).toBe('number');
      expect(result.items[0].reviewCount).toBe(18);
    });

    it('averageRating이 null이면 0으로 정규화한다', async () => {
      // Arrange: COALESCE 결과가 null인 경우 대비
      barRepo.query.mockResolvedValue([
        makeRawRow({ averageRating: null }),
      ]);

      // Act
      const result = await service.search({ lat: 13.75, lng: 100.5 });

      // Assert
      expect(result.items[0].averageRating).toBe(0);
    });

    it('reviewCount가 null이면 0으로 정규화한다', async () => {
      barRepo.query.mockResolvedValue([
        makeRawRow({ reviewCount: null }),
      ]);

      const result = await service.search({ lat: 13.75, lng: 100.5 });

      expect(result.items[0].reviewCount).toBe(0);
    });
  });

  // ───────────────────────────────────────────────
  // 7. isBookmarked 필드 (인증 상태별 × 모드별)
  // ───────────────────────────────────────────────
  describe('isBookmarked field', () => {
    /**
     * address 모드: 인증된 사용자(userId 제공)이고 해당 바를 북마크한 경우 isBookmarked: true
     */
    it('address 모드 + 인증 사용자: 북마크된 바의 isBookmarked는 true다', async () => {
      // Arrange: raw row에 isBookmarked: true 포함
      barRepo.query.mockResolvedValue([
        makeRawRow({ id: 1, isBookmarked: true }),
      ]);

      // Act: userId를 전달하여 인증 상태 시뮬레이션
      const result = await service.search(
        { lat: 13.75, lng: 100.5 },
        1, // userId
      );

      // Assert
      expect(result.items[0].isBookmarked).toBe(true);
    });

    /**
     * address 모드: userId가 undefined이면(비인증) isBookmarked는 항상 false
     */
    it('address 모드 + 비인증 사용자(userId=undefined): isBookmarked는 false다', async () => {
      // Arrange: raw row에 isBookmarked 미포함 (비인증 쿼리)
      barRepo.query.mockResolvedValue([
        makeRawRow({ id: 1 }),
      ]);

      // Act: userId 없이 호출
      const result = await service.search({ lat: 13.75, lng: 100.5 });

      // Assert
      expect(result.items[0].isBookmarked).toBe(false);
    });

    /**
     * name 모드: 인증된 사용자이고 해당 바를 북마크한 경우 isBookmarked: true
     */
    it('name 모드 + 인증 사용자: 북마크된 바의 isBookmarked는 true다', async () => {
      // Arrange
      barRepo.query.mockResolvedValue([
        makeRawRow({ id: 1, isBookmarked: true }),
      ]);

      // Act
      const result = await service.search(
        { name: 'Secret', userLat: 13.75, userLng: 100.5 },
        1,
      );

      // Assert
      expect(result.items[0].isBookmarked).toBe(true);
    });

    /**
     * name 모드: userId=undefined이면 isBookmarked는 false
     */
    it('name 모드 + 비인증 사용자(userId=undefined): isBookmarked는 false다', async () => {
      // Arrange
      barRepo.query.mockResolvedValue([
        makeRawRow({ id: 1 }),
      ]);

      // Act
      const result = await service.search({
        name: 'Secret',
        userLat: 13.75,
        userLng: 100.5,
      });

      // Assert
      expect(result.items[0].isBookmarked).toBe(false);
    });

    /**
     * combined 모드: 인증된 사용자이고 해당 바를 북마크한 경우 isBookmarked: true
     */
    it('combined 모드 + 인증 사용자: 북마크된 바의 isBookmarked는 true다', async () => {
      // Arrange
      barRepo.query.mockResolvedValue([
        makeRawRow({ id: 1, isBookmarked: true }),
      ]);

      // Act
      const result = await service.search(
        { name: 'Secret', lat: 13.75, lng: 100.5 },
        1,
      );

      // Assert
      expect(result.items[0].isBookmarked).toBe(true);
    });

    /**
     * combined 모드: userId=undefined이면 isBookmarked는 false
     */
    it('combined 모드 + 비인증 사용자(userId=undefined): isBookmarked는 false다', async () => {
      // Arrange
      barRepo.query.mockResolvedValue([
        makeRawRow({ id: 1 }),
      ]);

      // Act
      const result = await service.search({ name: 'Secret', lat: 13.75, lng: 100.5 });

      // Assert
      expect(result.items[0].isBookmarked).toBe(false);
    });

    /**
     * general 모드: 인증된 사용자이고 해당 바를 북마크한 경우 isBookmarked: true
     */
    it('general 모드 + 인증 사용자: 북마크된 바의 isBookmarked는 true다', async () => {
      // Arrange: mockBarEntity에 isBookmarked 플래그 추가
      const barWithBookmark = { ...mockBarEntity, isBookmarked: true };
      const qb = createMockQueryBuilder([barWithBookmark], 1);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      // Act
      const result = await service.search({}, 1);

      // Assert
      expect(result.items[0].isBookmarked).toBe(true);
    });

    /**
     * general 모드: userId=undefined이면 isBookmarked는 false
     */
    it('general 모드 + 비인증 사용자(userId=undefined): isBookmarked는 false다', async () => {
      // Arrange
      const qb = createMockQueryBuilder([mockBarEntity], 1);
      barRepo.createQueryBuilder.mockReturnValue(qb);

      // Act
      const result = await service.search({});

      // Assert
      expect(result.items[0].isBookmarked).toBe(false);
    });
  });
});
