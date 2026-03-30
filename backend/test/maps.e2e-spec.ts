import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { ThrottlerStorage } from '@nestjs/throttler';
import {
  createTestApp,
  createTestAppWithMapsMock,
  signupUser,
  createAdminUser,
  createBar,
  createApprovedBar,
  createRejectedBar,
} from './e2e-test-helper';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';
import { TEST_USER_1, TEST_USER_2, TEST_ADMIN, TEST_BAR_DTO } from './test-constants';

/** 테스트용 좌표 상수 */
const REF_POINT = { latitude: 37.5065, longitude: 127.0536 }; // 기준점 (TEST_BAR_DTO와 동일)
const NEAR_1KM = { latitude: 37.5155, longitude: 127.0536 }; // 기준점에서 ~1km
const NEAR_3KM = { latitude: 37.5335, longitude: 127.0536 }; // 기준점에서 ~3km
const FAR_15KM = { latitude: 37.6400, longitude: 127.0536 }; // 기준점에서 ~15km

describe('Maps (e2e)', () => {
  let app: INestApplication<App>;
  let mockApp: INestApplication<App>;
  let rateLimitApp: INestApplication<App>;
  let rateLimitMockApp: INestApplication<App>;

  beforeAll(async () => {
    await initTestDb();
    app = await createTestApp();
    mockApp = await createTestAppWithMapsMock();
    rateLimitApp = await createTestApp({ disableThrottling: false });
    rateLimitMockApp = await createTestAppWithMapsMock({ disableThrottling: false });
  });

  afterAll(async () => {
    await mockApp?.close();
    await app?.close();
    await rateLimitMockApp?.close();
    await rateLimitApp?.close();
  });

  beforeEach(async () => {
    await truncateAllTables(testDataSource);
  });

  // ─── Nearby bars ─────────────────────────────────

  describe('Nearby bars (GET /api/v1/bars/nearby)', () => {
    it('should return 401 for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/bars/nearby?lat=${REF_POINT.latitude}&lng=${REF_POINT.longitude}`)
        .expect(401);
    });

    it('should return bars within default 5km radius sorted by distance', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      // 1km, 3km 거리의 바 생성
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Near 1km',
        ...NEAR_1KM,
      });
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Near 3km',
        ...NEAR_3KM,
      });
      // 15km 거리 바 (기본 5km 밖)
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Far 15km',
        ...FAR_15KM,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/nearby?lat=${REF_POINT.latitude}&lng=${REF_POINT.longitude}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(2);
      // distanceKm 존재
      expect(res.body.items[0].distanceKm).toBeDefined();
      // 거리순 정렬
      expect(res.body.items[0].distanceKm).toBeLessThanOrEqual(
        res.body.items[1].distanceKm,
      );
    });

    it('should return bars within custom 10km radius', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Near 3km',
        ...NEAR_3KM,
      });
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Far 15km',
        ...FAR_15KM,
      });

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/bars/nearby?lat=${REF_POINT.latitude}&lng=${REF_POINT.longitude}&radiusKm=10`,
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      // 3km 바만 포함 (15km는 10km 밖)
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].name).toBe('Near 3km');
    });

    it('should return only bars within 0.1km radius', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Near 1km',
        ...NEAR_1KM,
      });

      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/bars/nearby?lat=${REF_POINT.latitude}&lng=${REF_POINT.longitude}&radiusKm=0.1`,
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      // 1km 거리 바는 0.1km 반경 밖
      expect(res.body.items.length).toBe(0);
    });

    it('should return 400 for invalid latitude > 90', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .get('/api/v1/bars/nearby?lat=91&lng=127.05')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(400);
    });

    it('should return 400 when latitude is missing', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .get('/api/v1/bars/nearby?lng=127.05')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(400);
    });

    it('should return only APPROVED bars', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await createBar(app, user.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Pending Bar',
        ...NEAR_1KM,
      });
      await createRejectedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Rejected Bar',
        ...NEAR_1KM,
      });
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Approved Bar',
        ...NEAR_1KM,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/nearby?lat=${REF_POINT.latitude}&lng=${REF_POINT.longitude}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].name).toBe('Approved Bar');
    });

    it('should return accurate distanceKm values', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        ...NEAR_1KM,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/nearby?lat=${REF_POINT.latitude}&lng=${REF_POINT.longitude}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(1);
      // ~1km 거리이므로 0.5 ~ 1.5 범위 내
      expect(res.body.items[0].distanceKm).toBeGreaterThan(0.5);
      expect(res.body.items[0].distanceKm).toBeLessThan(1.5);
    });

    it('should sort results by distanceKm ASC', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Far Bar',
        ...NEAR_3KM,
      });
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Close Bar',
        ...NEAR_1KM,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/nearby?lat=${REF_POINT.latitude}&lng=${REF_POINT.longitude}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBe(2);
      expect(res.body.items[0].distanceKm).toBeLessThan(
        res.body.items[1].distanceKm,
      );
    });
  });

  // ─── Directions ─────────────────────────────────

  describe('Directions (GET /api/v1/maps/directions)', () => {
    it('should return 401 for unauthenticated request', async () => {
      await request(mockApp.getHttpServer())
        .get('/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06')
        .expect(401);
    });

    it('should return WALKING route with steps, distance, duration, polyline', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      const res = await request(mockApp.getHttpServer())
        .get(
          '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06&mode=WALKING',
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.routes).toHaveLength(1);
      const route = res.body.routes[0];
      expect(route.steps.length).toBeGreaterThanOrEqual(1);
      expect(route.distance).toBeDefined();
      expect(route.distance.value).toBeGreaterThan(0);
      expect(route.duration).toBeDefined();
      expect(route.duration.value).toBeGreaterThan(0);
      expect(route.overviewPolyline).toBeDefined();
    });

    it('should return TRANSIT route with transit details', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      const res = await request(mockApp.getHttpServer())
        .get(
          '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06&mode=TRANSIT',
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.routes.length).toBeGreaterThanOrEqual(1);
      const route = res.body.routes[0];
      const transitStep = route.steps.find(
        (s: { travelMode: string }) => s.travelMode === 'TRANSIT',
      );
      expect(transitStep).toBeDefined();
      expect(transitStep.transitDetails).toBeDefined();
      expect(transitStep.transitDetails.lineName).toBeDefined();
      expect(transitStep.transitDetails.vehicleType).toBeDefined();
      expect(transitStep.transitDetails.stopCount).toBeGreaterThan(0);
    });

    it('should return up to 3 alternative TRANSIT routes', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      const res = await request(mockApp.getHttpServer())
        .get(
          '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06&mode=TRANSIT',
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.routes.length).toBeGreaterThan(1);
      expect(res.body.routes.length).toBeLessThanOrEqual(3);
    });

    it('should merge consecutive WALK steps in TRANSIT mode', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      const res = await request(mockApp.getHttpServer())
        .get(
          '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06&mode=TRANSIT',
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      const route = res.body.routes[0];
      // 연속된 WALK step이 없어야 함 (병합됨)
      for (let i = 0; i < route.steps.length - 1; i++) {
        const curr = route.steps[i].travelMode;
        const next = route.steps[i + 1].travelMode;
        expect(curr === 'WALK' && next === 'WALK').toBe(false);
      }
    });

    it('should return DRIVING route as single route', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      const res = await request(mockApp.getHttpServer())
        .get(
          '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06&mode=DRIVING',
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.routes).toHaveLength(1);
    });

    it('should return 400 for invalid origin latitude > 90', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      await request(mockApp.getHttpServer())
        .get(
          '/api/v1/maps/directions?originLat=91&originLng=127.05&destLat=37.51&destLng=127.06',
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(400);
    });

    it('should return 404 when no route found', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      await request(mockApp.getHttpServer())
        .get(
          '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=0&destLng=0',
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid mode BICYCLE', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      await request(mockApp.getHttpServer())
        .get(
          '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06&mode=BICYCLE',
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(400);
    });
  });

  // ─── Address search ─────────────────────────────

  describe('Address search (GET /api/v1/maps/address/search)', () => {
    it('should return 401 for unauthenticated request', async () => {
      await request(mockApp.getHttpServer())
        .get('/api/v1/maps/address/search?query=gangnam')
        .expect(401);
    });

    it('should return results for valid query', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      const res = await request(mockApp.getHttpServer())
        .get('/api/v1/maps/address/search?query=gangnam')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.results[0].displayName).toBeDefined();
      expect(res.body.results[0].formattedAddress).toBeDefined();
      expect(res.body.results[0].latitude).toBeDefined();
      expect(res.body.results[0].longitude).toBeDefined();
    });

    it('should return 400 for empty query', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      await request(mockApp.getHttpServer())
        .get('/api/v1/maps/address/search?query=')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(400);
    });

    it('should return 400 when query param missing', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      await request(mockApp.getHttpServer())
        .get('/api/v1/maps/address/search')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(400);
    });

    it('should return empty results for no-match query', async () => {
      const user = await signupUser(mockApp, TEST_USER_1);

      const res = await request(mockApp.getHttpServer())
        .get('/api/v1/maps/address/search?query=no-results-query')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.results).toEqual([]);
    });
  });

  // ─── Rate limiting (별도 앱 인스턴스로 격리) ─────────────────────

  describe('Maps Rate limiting', () => {
    beforeEach(async () => {
      // RESTART IDENTITY로 user ID가 리셋되므로 ThrottlerStorage도 클리어해야 함
      const mockStorage = rateLimitMockApp.get<{ storage: Map<string, unknown> }>(ThrottlerStorage);
      mockStorage.storage.clear();
      const appStorage = rateLimitApp.get<{ storage: Map<string, unknown> }>(ThrottlerStorage);
      appStorage.storage.clear();
    });

    it('should allow 10 consecutive directions requests', async () => {
      const user = await signupUser(rateLimitMockApp, TEST_USER_1);

      for (let i = 0; i < 10; i++) {
        await request(rateLimitMockApp.getHttpServer())
          .get(
            '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06',
          )
          .set('Cookie', `accessToken=${user.accessToken}`)
          .expect(200);
      }
    });

    it('should return 429 on 11th directions request', async () => {
      const user = await signupUser(rateLimitMockApp, TEST_USER_2);

      for (let i = 0; i < 10; i++) {
        await request(rateLimitMockApp.getHttpServer())
          .get(
            '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06',
          )
          .set('Cookie', `accessToken=${user.accessToken}`)
          .expect(200);
      }

      await request(rateLimitMockApp.getHttpServer())
        .get(
          '/api/v1/maps/directions?originLat=37.50&originLng=127.05&destLat=37.51&destLng=127.06',
        )
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(429);
    });

    it('should return 429 on 11th address/search request', async () => {
      const user = await signupUser(rateLimitMockApp, TEST_USER_1);

      for (let i = 0; i < 10; i++) {
        await request(rateLimitMockApp.getHttpServer())
          .get('/api/v1/maps/address/search?query=gangnam')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .expect(200);
      }

      await request(rateLimitMockApp.getHttpServer())
        .get('/api/v1/maps/address/search?query=gangnam')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(429);
    });

    it('should return 429 on 11th nearby request', async () => {
      const admin = await createAdminUser(rateLimitApp, TEST_ADMIN);
      const user = await signupUser(rateLimitApp, TEST_USER_1);

      for (let i = 0; i < 10; i++) {
        await request(rateLimitApp.getHttpServer())
          .get(`/api/v1/bars/nearby?lat=${REF_POINT.latitude}&lng=${REF_POINT.longitude}`)
          .set('Cookie', `accessToken=${user.accessToken}`)
          .expect(200);
      }

      await request(rateLimitApp.getHttpServer())
        .get(`/api/v1/bars/nearby?lat=${REF_POINT.latitude}&lng=${REF_POINT.longitude}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(429);
    });
  });
});
