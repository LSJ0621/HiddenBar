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
  removeBookmark,
} from './e2e-test-helper';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';
import { TEST_USER_1, TEST_USER_2, TEST_ADMIN, TEST_BAR_DTO } from './test-constants';

describe('Bookmarks (e2e)', () => {
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

  // ─── Add Bookmark ─────────────────────────────────

  describe('Add bookmark (PUT /api/v1/bars/:id/bookmark)', () => {
    it('should add bookmark to approved bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      const res = await addBookmark(app, user.accessToken, bar.id);

      expect(res.isBookmarked).toBe(true);
      expect(res.bookmarkCount).toBeGreaterThanOrEqual(1);
    });

    it('should be idempotent when adding bookmark twice', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      await addBookmark(app, user.accessToken, bar.id);
      const res = await addBookmark(app, user.accessToken, bar.id);

      expect(res.isBookmarked).toBe(true);
      expect(res.bookmarkCount).toBe(1);
    });

    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/bars/1/bookmark')
        .expect(401);
    });

    it('should return 404 for non-existent bar', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .put('/api/v1/bars/999999/bookmark')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });

    it('should return 404 for PENDING bar', async () => {
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .put(`/api/v1/bars/${bar.id}/bookmark`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });

    it('should return 404 for REJECTED bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createRejectedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .put(`/api/v1/bars/${bar.id}/bookmark`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      // 관리자가 바를 삭제
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/bars/${bar.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .put(`/api/v1/bars/${bar.id}/bookmark`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });
  });

  // ─── Remove Bookmark ──────────────────────────────

  describe('Remove bookmark (DELETE /api/v1/bars/:id/bookmark)', () => {
    it('should remove existing bookmark', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      await addBookmark(app, user.accessToken, bar.id);
      const res = await removeBookmark(app, user.accessToken, bar.id);

      expect(res.isBookmarked).toBe(false);
      expect(res.bookmarkCount).toBe(0);
    });

    it('should be idempotent when removing non-existent bookmark', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      const res = await removeBookmark(app, user.accessToken, bar.id);

      expect(res.isBookmarked).toBe(false);
      expect(res.bookmarkCount).toBe(0);
    });

    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/bars/1/bookmark')
        .expect(401);
    });
  });

  // ─── Bookmark List ────────────────────────────────

  describe('Bookmark list (GET /api/v1/users/me/bookmarks)', () => {
    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me/bookmarks')
        .expect(401);
    });

    it('should paginate bookmarks with page and limit', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      // 6개 바 생성 + 북마크
      for (let i = 1; i <= 6; i++) {
        const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, {
          ...TEST_BAR_DTO,
          name: `Bar ${i}`,
        });
        await addBookmark(app, user.accessToken, bar.id);
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/bookmarks?page=1&limit=2')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.meta.totalItems).toBe(6);
      expect(res.body.meta.totalPages).toBe(3);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
    });

    it('should return bookmarks sorted by bookmarkedAt DESC', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      const bar1 = await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'First Bar',
      });
      await addBookmark(app, user.accessToken, bar1.id);

      const bar2 = await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Second Bar',
      });
      await addBookmark(app, user.accessToken, bar2.id);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/bookmarks')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items[0].name).toBe('Second Bar');
      expect(res.body.items[1].name).toBe('First Bar');
    });

    it('should return empty list when user has no bookmarks', async () => {
      const user = await signupUser(app, TEST_USER_1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/bookmarks')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.meta.totalItems).toBe(0);
    });

    it('should exclude soft-deleted bars from bookmark list', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      const bar1 = await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Active Bar',
      });
      await addBookmark(app, user.accessToken, bar1.id);

      const bar2 = await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Deleted Bar',
      });
      await addBookmark(app, user.accessToken, bar2.id);

      // 관리자가 bar2 삭제
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/bars/${bar2.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/bookmarks')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe('Active Bar');
    });
  });

  // ─── Bar Detail isBookmarked Field ────────────────

  describe('Bar detail isBookmarked field', () => {
    it('should return isBookmarked true for bookmarked bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);
      await addBookmark(app, user.accessToken, bar.id);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.isBookmarked).toBe(true);
    });

    it('should return isBookmarked false for non-bookmarked bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.isBookmarked).toBe(false);
    });

    it('should return 401 for unauthenticated access', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}`)
        .expect(401);
    });
  });
});
