import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import {
  createTestApp,
  signupUser,
  createAdminUser,
  createBar,
  createApprovedBar,
  createRejectedBar,
  addBookmark,
} from './e2e-test-helper';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';
import {
  TEST_USER_1,
  TEST_USER_2,
  TEST_ADMIN,
  TEST_BAR_DTO,
} from './test-constants';

/** 테스트용 좌표 상수 */
const GANGNAM = { latitude: 37.4979, longitude: 127.0276 };
const ITAEWON = { latitude: 37.5345, longitude: 126.9946 };
const BANGKOK = { latitude: 13.7563, longitude: 100.5018 };

describe('Search (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await initTestDb();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await truncateAllTables(testDataSource);
  });

  // ─── Name search ─────────────────────────────────

  describe('Name search (GET /api/v1/bars/search?name=...)', () => {
    it('should return bars matching name', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Cocktail Paradise',
      });
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Beer Garden',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search?name=cocktail')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(
        res.body.items.every((item: { name: string }) =>
          item.name.toLowerCase().includes('cocktail'),
        ),
      ).toBe(true);
    });

    it('should sort by distance when userLat/userLng provided', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      // 동일 이름으로 similarity 동일하게 — 거리 차이만 테스트
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Secret Lounge',
        ...GANGNAM,
      });
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Secret Lounge',
        ...BANGKOK,
      });

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/bars/search?name=secret&userLat=${GANGNAM.latitude}&userLng=${GANGNAM.longitude}`,
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(2);
      // similarity 동일 → 가까운 바가 먼저
      expect(res.body.items[0].distanceKm).toBeLessThan(
        res.body.items[1].distanceKm,
      );
    });

    it('should return empty items for non-matching name', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search?name=zzznotexist')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items).toEqual([]);
    });

    it('should exclude PENDING and REJECTED bars', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Test Pending',
      });
      await createRejectedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Test Rejected',
      });
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Test Approved',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search?name=test')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].name).toBe('Test Approved');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bars/search?name=test')
        .expect(401);
    });
  });

  // ─── General / Location search ─────────────────────────────

  describe('General/Location search (GET /api/v1/bars/search)', () => {
    it('should return default list without params', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.mode).toBe('general');
    });

    it('should return bars near given coordinates', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      // 강남 근처 바
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        ...GANGNAM,
      });
      // 방콕 바 (멀리)
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Bangkok Bar',
        ...BANGKOK,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/search?lat=${GANGNAM.latitude}&lng=${GANGNAM.longitude}&radiusKm=5`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.mode).toBe('address');
      // 방콕 바는 5km 밖이므로 미포함
      expect(
        res.body.items.every(
          (item: { name: string }) => item.name !== 'Bangkok Bar',
        ),
      ).toBe(true);
    });

    it('should return combined results for name+location', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Combo Bar',
        ...GANGNAM,
      });

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/bars/search?name=combo&lat=${GANGNAM.latitude}&lng=${GANGNAM.longitude}`,
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.mode).toBe('combined');
    });

    it('should return 400 when lat provided without lng', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .get('/api/v1/bars/search?lat=37.50')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(400);
    });
  });

  // ─── Sorting ─────────────────────────────────

  describe('Sorting', () => {
    it('should sort by newest (createdAt DESC)', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar1 = await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Oldest Bar',
      });
      const bar2 = await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Newest Bar',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search?sortBy=newest')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(2);
      // 최신이 먼저
      expect(res.body.items[0].id).toBe(bar2.id);
      expect(res.body.items[1].id).toBe(bar1.id);
    });

    it('should sort by bookmarks DESC', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user1 = await signupUser(app, TEST_USER_1);
      const user2 = await signupUser(app, TEST_USER_2);

      const popularBar = await createApprovedBar(
        app,
        user1.accessToken,
        admin.accessToken,
        { ...TEST_BAR_DTO, name: 'Popular Bar' },
      );
      const unpopularBar = await createApprovedBar(
        app,
        user1.accessToken,
        admin.accessToken,
        { ...TEST_BAR_DTO, name: 'Unpopular Bar' },
      );

      // popular bar에 북마크 2개
      await addBookmark(app, user1.accessToken, popularBar.id);
      await addBookmark(app, user2.accessToken, popularBar.id);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search?sortBy=bookmarks')
        .set('Cookie', `accessToken=${user1.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(2);
      expect(res.body.items[0].id).toBe(popularBar.id);
      expect(res.body.items[1].id).toBe(unpopularBar.id);
    });

    it('should use distance as secondary sort with name search', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      // 동일 이름, 다른 거리
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Same Name Bar',
        ...ITAEWON,
      });
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Same Name Bar',
        ...GANGNAM,
      });

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/bars/search?name=same+name&userLat=${GANGNAM.latitude}&userLng=${GANGNAM.longitude}`,
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(2);
      // 강남에서 더 가까운 바가 먼저
      expect(res.body.items[0].distanceKm).toBeDefined();
      expect(res.body.items[0].distanceKm).toBeLessThanOrEqual(
        res.body.items[1].distanceKm,
      );
    });
  });

  // ─── Pagination ─────────────────────────────────

  describe('Pagination', () => {
    it('should return limited items with hasMore=true', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      // 6개 바 생성
      for (let i = 0; i < 6; i++) {
        await createApprovedBar(app, user.accessToken, admin.accessToken, {
          ...TEST_BAR_DTO,
          name: `Pagination Bar ${i}`,
        });
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search?offset=0&limit=5')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(5);
      expect(res.body.hasMore).toBe(true);
    });

    it('should return next page with offset', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      for (let i = 0; i < 8; i++) {
        await createApprovedBar(app, user.accessToken, admin.accessToken, {
          ...TEST_BAR_DTO,
          name: `Page Bar ${i}`,
        });
      }

      const page1 = await request(app.getHttpServer())
        .get('/api/v1/bars/search?offset=0&limit=5')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      const page2 = await request(app.getHttpServer())
        .get('/api/v1/bars/search?offset=5&limit=5')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(page1.body.items.length).toBe(5);
      expect(page2.body.items.length).toBe(3);
      // 중복 없음
      const page1Ids = page1.body.items.map((i: { id: number }) => i.id);
      const page2Ids = page2.body.items.map((i: { id: number }) => i.id);
      const overlap = page1Ids.filter((id: number) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should return hasMore=false for last page', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      for (let i = 0; i < 3; i++) {
        await createApprovedBar(app, user.accessToken, admin.accessToken, {
          ...TEST_BAR_DTO,
          name: `Last Bar ${i}`,
        });
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search?offset=0&limit=5')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(3);
      expect(res.body.hasMore).toBe(false);
    });

    it('should return empty items for offset beyond data', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search?offset=100&limit=5')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.hasMore).toBe(false);
    });
  });
});
