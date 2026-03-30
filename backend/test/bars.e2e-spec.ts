import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import {
  createTestApp,
  signupUser,
  createAdminUser,
  createBar,
  createApprovedBar,
  uploadPhoto,
} from './e2e-test-helper';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';
import {
  TEST_USER_1,
  TEST_USER_2,
  TEST_ADMIN,
  TEST_BAR_DTO,
} from './test-constants';

const FIXTURE_IMAGE_PATH = path.join(__dirname, 'fixtures', 'test-image.jpg');
const FIXTURE_TXT_PATH = path.join(__dirname, 'fixtures', 'test-file.txt');

describe('Bars (e2e)', () => {
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

  // ─── Create → Approve → Search Flow ─────────────────

  describe('Bar lifecycle', () => {
    it('create bar (PENDING) → admin approve → visible in bar detail', async () => {
      const user = await signupUser(app, TEST_USER_1);

      // 1. Create bar — should be PENDING
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);
      expect(bar.status).toBe('PENDING');
      expect(bar.name).toBe(TEST_BAR_DTO.name);

      // 2. Admin approves
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Looks great' })
        .expect(200);

      // 3. Bar detail should be accessible (인증 필수)
      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(detailRes.body.status).toBe('APPROVED');
      expect(detailRes.body.name).toBe(TEST_BAR_DTO.name);
    });
  });

  // ─── Bar CRUD ───────────────────────────────────────

  describe('Bar CRUD operations', () => {
    it('should update bar and set status to PENDING', async () => {
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({ name: 'Updated Bar Name' })
        .expect(200);

      expect(updateRes.body.name).toBe('Updated Bar Name');
      expect(updateRes.body.status).toBe('PENDING');
    });

    it('should delete bar (soft delete)', async () => {
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .delete(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(204);

      // Bar should not be found after soft delete
      await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });
  });

  // ─── My Bars ────────────────────────────────────────

  describe('My bars', () => {
    it('should return only bars owned by the user', async () => {
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, TEST_BAR_DTO);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/my')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.meta.totalItems).toBe(1);
    });
  });

  // ─── 바 등록 (POST /api/v1/bars) ──────────────────────

  describe('바 등록 (POST /api/v1/bars)', () => {
    it('should create bar with required fields only → 201 + PENDING', async () => {
      const user = await signupUser(app, TEST_USER_1);

      const res = await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send(TEST_BAR_DTO)
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.name).toBe(TEST_BAR_DTO.name);
      expect(res.body.description).toBe(TEST_BAR_DTO.description);
      expect(res.body.address).toBe(TEST_BAR_DTO.address);
      expect(res.body.latitude).toBe(TEST_BAR_DTO.latitude);
      expect(res.body.longitude).toBe(TEST_BAR_DTO.longitude);
    });

    it('should create bar with all optional fields → 201', async () => {
      const user = await signupUser(app, TEST_USER_1);

      const fullDto = {
        ...TEST_BAR_DTO,
        phone: '02-1234-5678',
        website: 'https://example.com',
        menuItems: [{ name: 'Mojito', price: 15 }],
        operatingHours: [
          { dayOfWeek: 'FRI', openTime: '18:00', closeTime: '02:00' },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send(fullDto)
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.phone).toBe('02-1234-5678');
      expect(res.body.website).toBe('https://example.com');
      expect(res.body.menuItems).toHaveLength(1);
      expect(res.body.operatingHours).toHaveLength(1);
    });

    it('should return 400 when name is missing', async () => {
      const user = await signupUser(app, TEST_USER_1);
      const { name: _, ...noNameDto } = TEST_BAR_DTO;

      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send(noNameDto)
        .expect(400);
    });

    it('should return 400 when latitude > 90', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({ ...TEST_BAR_DTO, latitude: 91 })
        .expect(400);
    });

    it('should return 400 when longitude > 180', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({ ...TEST_BAR_DTO, longitude: 181 })
        .expect(400);
    });

    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .send(TEST_BAR_DTO)
        .expect(401);
    });

    it('should return 400 for empty menu item name', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({ ...TEST_BAR_DTO, menuItems: [{ name: '', price: 10 }] })
        .expect(400);
    });

    it('should return 400 for negative menu item price', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({ ...TEST_BAR_DTO, menuItems: [{ name: 'Beer', price: -5 }] })
        .expect(400);
    });

    it('should return 400 for invalid dayOfWeek', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({
          ...TEST_BAR_DTO,
          operatingHours: [
            { dayOfWeek: 'INVALID', openTime: '18:00', closeTime: '02:00' },
          ],
        })
        .expect(400);
    });

    it('should return 400 for invalid time format', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({
          ...TEST_BAR_DTO,
          operatingHours: [
            { dayOfWeek: 'MON', openTime: '6pm', closeTime: '2am' },
          ],
        })
        .expect(400);
    });
  });

  // ─── 바 조회 (GET /api/v1/bars/:id) ───────────────────

  describe('바 조회 (GET /api/v1/bars/:id)', () => {
    it('should return bar detail with isBookmarked for authenticated user', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const admin = await createAdminUser(app, TEST_ADMIN);
      const bar = await createApprovedBar(
        app,
        owner.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(200);

      expect(res.body.name).toBe(TEST_BAR_DTO.name);
      expect(res.body.status).toBe('APPROVED');
      expect(res.body.isBookmarked).toBe(false);
      expect(res.body.bookmarkCount).toBe(0);
    });

    it('should return 404 when other user accesses PENDING bar', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const otherUser = await signupUser(app, TEST_USER_2);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${otherUser.accessToken}`)
        .expect(404);
    });

    it('should return 200 when owner accesses own PENDING bar', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('PENDING');
    });

    it('should return 200 when admin accesses PENDING bar', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const admin = await createAdminUser(app, TEST_ADMIN);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);
    });

    it('should return 401 when unauthenticated user accesses PENDING bar', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .expect(401);
    });

    it('should return 401 when unauthenticated user accesses APPROVED bar', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const admin = await createAdminUser(app, TEST_ADMIN);
      const bar = await createApprovedBar(
        app,
        owner.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );

      await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .expect(401);
    });

    it('should return 404 for non-existent bar ID', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .get('/api/v1/bars/999999')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });
  });

  // ─── 바 수정 (PATCH /api/v1/bars/:id) ─────────────────

  describe('바 수정 (PATCH /api/v1/bars/:id)', () => {
    it('should return 403 when non-owner tries to update', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const otherUser = await signupUser(app, TEST_USER_2);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${otherUser.accessToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('should return 404 for non-existent bar', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/bars/999999')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });

    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/bars/1')
        .send({ name: 'No Auth' })
        .expect(401);
    });

    it('should preserve other fields on partial update', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, {
        ...TEST_BAR_DTO,
        description: 'Original description',
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.name).toBe('New Name');
      expect(res.body.description).toBe('Original description');
      expect(res.body.address).toBe(TEST_BAR_DTO.address);
      expect(res.body.city).toBe(TEST_BAR_DTO.city);
    });

    it('should replace menu items on update', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, {
        ...TEST_BAR_DTO,
        menuItems: [{ name: 'Beer', price: 5 }],
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .send({
          menuItems: [
            { name: 'Wine', price: 12 },
            { name: 'Cocktail', price: 15 },
          ],
        })
        .expect(200);

      expect(res.body.menuItems).toHaveLength(2);
      expect(res.body.menuItems.map((m: { name: string }) => m.name)).toEqual(
        expect.arrayContaining(['Wine', 'Cocktail']),
      );
    });

    it('should replace operating hours on update', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, {
        ...TEST_BAR_DTO,
        operatingHours: [
          { dayOfWeek: 'MON', openTime: '18:00', closeTime: '02:00' },
        ],
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .send({
          operatingHours: [
            { dayOfWeek: 'SAT', openTime: '20:00', closeTime: '04:00' },
          ],
        })
        .expect(200);

      expect(res.body.operatingHours).toHaveLength(1);
      expect(res.body.operatingHours[0].dayOfWeek).toBe('SAT');
    });

    it('should return 400 for invalid latitude value', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .send({ latitude: 200 })
        .expect(400);
    });
  });

  // ─── 바 삭제 (DELETE /api/v1/bars/:id) ─────────────────

  describe('바 삭제 (DELETE /api/v1/bars/:id)', () => {
    it('should return 403 when non-owner tries to delete', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const otherUser = await signupUser(app, TEST_USER_2);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .delete(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${otherUser.accessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent bar', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .delete('/api/v1/bars/999999')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });

    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/bars/1')
        .expect(401);
    });

    it('should return 404 when re-deleting already deleted bar', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .delete(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(404);
    });
  });

  // ─── 내 바 목록 (GET /api/v1/bars/my) ─────────────────

  describe('내 바 목록 (GET /api/v1/bars/my)', () => {
    it('should filter by status=PENDING', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const admin = await createAdminUser(app, TEST_ADMIN);

      // 2개 바 생성 (둘 다 PENDING)
      await createBar(app, owner.accessToken, TEST_BAR_DTO);
      const bar2 = await createBar(app, owner.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Second Bar',
      });

      // 1개만 승인
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar2.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/my?status=PENDING')
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe('PENDING');
    });

    it('should filter by status=APPROVED', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const admin = await createAdminUser(app, TEST_ADMIN);

      await createBar(app, owner.accessToken, TEST_BAR_DTO);
      const bar2 = await createBar(app, owner.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Approved Bar',
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar2.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/my?status=APPROVED')
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe('APPROVED');
    });

    it('should filter by status=REJECTED', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const admin = await createAdminUser(app, TEST_ADMIN);

      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/reject`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Not suitable' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/my?status=REJECTED')
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe('REJECTED');
    });

    it('should paginate with page and limit', async () => {
      const owner = await signupUser(app, TEST_USER_1);

      for (let i = 0; i < 7; i++) {
        await createBar(app, owner.accessToken, {
          ...TEST_BAR_DTO,
          name: `Bar ${i}`,
        });
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/my?page=1&limit=5')
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(5);
      expect(res.body.meta.totalItems).toBe(7);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bars/my')
        .expect(401);
    });

    it('should return empty list for user with no bars', async () => {
      const user = await signupUser(app, TEST_USER_1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/my')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.meta.totalItems).toBe(0);
    });
  });

  // ─── 사진 업로드 (POST /api/v1/bars/:id/photos) ────────

  describe('사진 업로드 (POST /api/v1/bars/:id/photos)', () => {
    it('should upload single JPEG file → 201', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/bars/${bar.id}/photos`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .attach('files', FIXTURE_IMAGE_PATH)
        .expect(201);

      expect(res.body.photos).toHaveLength(1);
      expect(res.body.failedCount).toBe(0);
    });

    it('should upload multiple files (3) → 201', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/bars/${bar.id}/photos`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .attach('files', FIXTURE_IMAGE_PATH)
        .attach('files', FIXTURE_IMAGE_PATH)
        .attach('files', FIXTURE_IMAGE_PATH)
        .expect(201);

      expect(res.body.photos).toHaveLength(3);
      expect(res.body.failedCount).toBe(0);
    });

    it('should return 400 when exceeding 5 files', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .post(`/api/v1/bars/${bar.id}/photos`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .attach('files', FIXTURE_IMAGE_PATH)
        .attach('files', FIXTURE_IMAGE_PATH)
        .attach('files', FIXTURE_IMAGE_PATH)
        .attach('files', FIXTURE_IMAGE_PATH)
        .attach('files', FIXTURE_IMAGE_PATH)
        .attach('files', FIXTURE_IMAGE_PATH)
        .expect(400);
    });

    it('should return 400 for invalid file type (txt)', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .post(`/api/v1/bars/${bar.id}/photos`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .attach('files', FIXTURE_TXT_PATH)
        .expect(400);
    });

    it('should return 413 for file exceeding 5MB', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);

      await request(app.getHttpServer())
        .post(`/api/v1/bars/${bar.id}/photos`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .attach('files', largeBuffer, {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        })
        .expect(413);
    });

    it('should return 403 when non-owner uploads', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const otherUser = await signupUser(app, TEST_USER_2);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .post(`/api/v1/bars/${bar.id}/photos`)
        .set('Cookie', `accessToken=${otherUser.accessToken}`)
        .attach('files', FIXTURE_IMAGE_PATH)
        .expect(403);
    });

    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bars/1/photos')
        .attach('files', FIXTURE_IMAGE_PATH)
        .expect(401);
    });

    it('should return 404 for non-existent bar', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/bars/999999/photos')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('files', FIXTURE_IMAGE_PATH)
        .expect(404);
    });
  });

  // ─── 사진 삭제 (DELETE /api/v1/bars/:id/photos/:photoId) ─

  describe('사진 삭제 (DELETE /api/v1/bars/:id/photos/:photoId)', () => {
    it('should delete photo as owner → 204', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);
      const photoRes = await uploadPhoto(
        app,
        owner.accessToken,
        bar.id,
        FIXTURE_IMAGE_PATH,
      );
      const photoId = photoRes.photos[0].id;

      await request(app.getHttpServer())
        .delete(`/api/v1/bars/${bar.id}/photos/${photoId}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(204);
    });

    it('should return 403 when non-owner deletes photo', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const otherUser = await signupUser(app, TEST_USER_2);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);
      const photoRes = await uploadPhoto(
        app,
        owner.accessToken,
        bar.id,
        FIXTURE_IMAGE_PATH,
      );
      const photoId = photoRes.photos[0].id;

      await request(app.getHttpServer())
        .delete(`/api/v1/bars/${bar.id}/photos/${photoId}`)
        .set('Cookie', `accessToken=${otherUser.accessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent photo', async () => {
      const owner = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .delete(`/api/v1/bars/${bar.id}/photos/999999`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(404);
    });

    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/bars/1/photos/1')
        .expect(401);
    });
  });
});
