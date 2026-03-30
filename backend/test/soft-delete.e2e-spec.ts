import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { createTestApp, signupUser, createAdminUser } from './e2e-test-helper';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';

describe('Soft Delete Cascade (e2e)', () => {
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

  /**
   * DB에서 직접 soft deleted 레코드 수를 조회하는 헬퍼.
   */
  async function countSoftDeleted(
    table: string,
    where?: string,
  ): Promise<number> {
    const condition = where ? `AND ${where}` : '';
    const result = await testDataSource.query(
      `SELECT COUNT(*) as count FROM ${table} WHERE "deletedAt" IS NOT NULL ${condition}`,
    );
    return parseInt(result[0].count, 10);
  }

  async function countActive(table: string, where?: string): Promise<number> {
    const condition = where ? `AND ${where}` : '';
    const result = await testDataSource.query(
      `SELECT COUNT(*) as count FROM ${table} WHERE "deletedAt" IS NULL ${condition}`,
    );
    return parseInt(result[0].count, 10);
  }

  // ─── Bar soft delete cascade ────────────────────────

  describe('Bar soft delete cascade', () => {
    it('should cascade soft delete photos, menu items, operating hours, and bookmarks', async () => {
      const owner = await signupUser(app, {
        email: 'bar-cascade@test.com',
        password: 'Password123!',
        name: 'CascadeOwner',
      });

      // Create bar with menu items and operating hours
      const barRes = await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .send({
          name: 'Cascade Bar',
          address: '123 Rd',
          city: 'Bangkok',
          country: 'Thailand',
          latitude: 13.75,
          longitude: 100.5,

          menuItems: [
            { name: 'Cocktail A', price: 300 },
            { name: 'Cocktail B', price: 350 },
          ],
          operatingHours: [
            { dayOfWeek: 'MON', openTime: '18:00', closeTime: '02:00' },
            { dayOfWeek: 'TUE', openTime: '18:00', closeTime: '02:00' },
          ],
        })
        .expect(201);

      const barId = barRes.body.id;

      // Approve bar so it can be bookmarked
      const admin = await createAdminUser(app, {
        email: 'cascade-admin@test.com',
        password: 'AdminPass123!',
        name: 'CascadeAdmin',
      });
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${barId}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({})
        .expect(200);

      // Create a bookmark
      const bookmarker = await signupUser(app, {
        email: 'bookmarker@test.com',
        password: 'Password123!',
        name: 'Bookmarker',
      });
      await request(app.getHttpServer())
        .put(`/api/v1/bars/${barId}/bookmark`)
        .set('Cookie', `accessToken=${bookmarker.accessToken}`)
        .expect(200);

      // Verify data exists before delete
      expect(await countActive('menu_items', `"barId" = ${barId}`)).toBe(2);
      expect(await countActive('operating_hours', `"barId" = ${barId}`)).toBe(
        2,
      );
      expect(await countActive('bookmarks', `"barId" = ${barId}`)).toBe(1);

      // Delete bar
      await request(app.getHttpServer())
        .delete(`/api/v1/bars/${barId}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(204);

      // Verify cascade soft delete
      expect(await countSoftDeleted('bars', `id = ${barId}`)).toBe(1);
      expect(await countSoftDeleted('menu_items', `"barId" = ${barId}`)).toBe(
        2,
      );
      expect(
        await countSoftDeleted('operating_hours', `"barId" = ${barId}`),
      ).toBe(2);
      expect(await countSoftDeleted('bookmarks', `"barId" = ${barId}`)).toBe(1);
    });
  });

  // ─── Admin actions preserved ────────────────────────

  describe('Admin actions preservation', () => {
    it('should preserve admin_actions when bar is deleted', async () => {
      const admin = await createAdminUser(app, {
        email: 'preserve-admin@test.com',
        password: 'AdminPass123!',
        name: 'PreserveAdmin',
      });

      const owner = await signupUser(app, {
        email: 'preserve-owner@test.com',
        password: 'Password123!',
        name: 'PreserveOwner',
      });

      const barRes = await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .send({
          name: 'Preserve Bar',
          address: '123 Rd',
          city: 'Bangkok',
          country: 'Thailand',
          latitude: 13.75,
          longitude: 100.5,

        })
        .expect(201);

      const barId = barRes.body.id;

      // Admin approves then deletes (creates 2 admin actions)
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${barId}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({})
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/bars/${barId}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({})
        .expect(204);

      // Admin actions should still exist (no soft delete)
      const actions = await testDataSource.query(
        `SELECT COUNT(*) as count FROM admin_actions WHERE "targetType" = 'BAR' AND "targetId" = $1`,
        [barId],
      );
      expect(parseInt(actions[0].count, 10)).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── withDeleted query ──────────────────────────────

  describe('withDeleted query', () => {
    it('should be able to find soft deleted records with direct DB query', async () => {
      const owner = await signupUser(app, {
        email: 'withdeleted@test.com',
        password: 'Password123!',
        name: 'WithDeletedUser',
      });

      const barRes = await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .send({
          name: 'Deletable Bar',
          address: '123 Rd',
          city: 'Bangkok',
          country: 'Thailand',
          latitude: 13.75,
          longitude: 100.5,

        })
        .expect(201);

      const barId = barRes.body.id;

      // Delete bar
      await request(app.getHttpServer())
        .delete(`/api/v1/bars/${barId}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(204);

      // API should not find it (인증 필수 엔드포인트)
      await request(app.getHttpServer())
        .get(`/api/v1/bars/${barId}`)
        .set('Cookie', `accessToken=${owner.accessToken}`)
        .expect(404);

      // DB query with deletedAt should find it
      const result = await testDataSource.query(
        `SELECT * FROM bars WHERE id = $1`,
        [barId],
      );
      expect(result).toHaveLength(1);
      expect(result[0].deletedAt).not.toBeNull();
    });
  });
});
