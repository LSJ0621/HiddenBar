import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import {
  createTestApp,
  signupUser,
  createAdminUser,
  createApprovedBar,
  createBar,
  createReview,
} from './e2e-test-helper';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';
import { TEST_USER_1, TEST_USER_2, TEST_ADMIN, TEST_BAR_DTO } from './test-constants';

const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-image.jpg');
const FIXTURE_PNG = path.join(__dirname, 'fixtures', 'test-image.png');
const FIXTURE_TXT = path.join(__dirname, 'fixtures', 'test-file.txt');

describe('Reviews (e2e)', () => {
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
   * 바 리뷰 목록과 통계를 조회하는 로컬 헬퍼.
   */
  async function getBarReviews(
    token: string,
    barId: number,
    query: Record<string, string | number> = {},
  ) {
    const req = request(app.getHttpServer())
      .get(`/api/v1/bars/${barId}/reviews`)
      .set('Cookie', `accessToken=${token}`);

    for (const [key, value] of Object.entries(query)) {
      req.query({ [key]: String(value) });
    }

    const res = await req.expect(200);
    return res.body;
  }

  /**
   * 리뷰 사진을 업로드하는 로컬 헬퍼.
   */
  async function uploadReviewPhoto(
    token: string,
    reviewId: number,
    filePath: string,
  ) {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/photos`)
      .set('Cookie', `accessToken=${token}`)
      .attach('files', filePath)
      .expect(201);
    return res.body;
  }

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/v1/reviews — 리뷰 생성
  // ─────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/reviews', () => {
    describe('성공', () => {
      it('should create a review with all fields', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        const res = await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({
            barId: bar.id,
            rating: 4,
            content: 'Great atmosphere and drinks!',
            visitedAt: '2025-12-01',
          })
          .expect(201);

        expect(res.body.id).toBeDefined();
        expect(res.body.rating).toBe(4);
        expect(res.body.content).toBe('Great atmosphere and drinks!');
        expect(res.body.visitedAt).toContain('2025-12-01');
        expect(res.body.status).toBe('PUBLISHED');
        expect(res.body.author.id).toBe(user.user.id);
      });

      it('should create a review without visitedAt', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        const res = await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: bar.id, rating: 3, content: 'Decent place' })
          .expect(201);

        expect(res.body.visitedAt).toBeNull();
      });

      it('should accept rating=1 (lower boundary)', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        const res = await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: bar.id, rating: 1, content: 'Not great' })
          .expect(201);

        expect(res.body.rating).toBe(1);
      });

      it('should accept rating=5 (upper boundary)', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        const res = await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: bar.id, rating: 5, content: 'Perfect!' })
          .expect(201);

        expect(res.body.rating).toBe(5);
      });
    });

    describe('유효성 검증 (400)', () => {
      it('should reject rating=0', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: bar.id, rating: 0, content: 'Test' })
          .expect(400);
      });

      it('should reject rating=6', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: bar.id, rating: 6, content: 'Test' })
          .expect(400);
      });

      it('should reject non-integer rating', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: bar.id, rating: 3.5, content: 'Test' })
          .expect(400);
      });

      it('should reject whitespace-only content', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: bar.id, rating: 4, content: '   ' })
          .expect(400);
      });

      it('should reject content exceeding 2000 chars', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: bar.id, rating: 4, content: 'a'.repeat(2001) })
          .expect(400);
      });

      it('should reject future visitedAt', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({
            barId: bar.id,
            rating: 4,
            content: 'Test',
            visitedAt: '2099-01-01',
          })
          .expect(400);
      });

      it('should reject invalid visitedAt format', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({
            barId: bar.id,
            rating: 4,
            content: 'Test',
            visitedAt: 'not-a-date',
          })
          .expect(400);
      });

      it('should reject missing barId', async () => {
        const user = await signupUser(app, TEST_USER_1);

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ rating: 4, content: 'Test' })
          .expect(400);
      });
    });

    describe('인증/비즈니스 규칙', () => {
      it('should return 401 without auth', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .send({ barId: 1, rating: 4, content: 'Test' })
          .expect(401);
      });

      it('should return 404 for non-existent bar', async () => {
        const user = await signupUser(app, TEST_USER_1);

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: 99999, rating: 4, content: 'Test' })
          .expect(404);
      });

      it('should return 404 for non-APPROVED bar', async () => {
        const user = await signupUser(app, TEST_USER_1);
        const pendingBar = await createBar(app, user.accessToken, TEST_BAR_DTO);

        await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: pendingBar.id, rating: 4, content: 'Test' })
          .expect(404);
      });

      it('should return 409 for duplicate review', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await createReview(app, user.accessToken, bar.id);

        const res = await request(app.getHttpServer())
          .post('/api/v1/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ barId: bar.id, rating: 5, content: 'Second review' })
          .expect(409);

        expect(res.body.message).toBeDefined();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/v1/bars/:barId/reviews — 리뷰 목록
  // ─────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/bars/:barId/reviews', () => {
    describe('성공', () => {
      it('should return reviews with meta and stats', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user1 = await signupUser(app, TEST_USER_1);
        const user2 = await signupUser(app, TEST_USER_2);
        const bar = await createApprovedBar(
          app,
          user1.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await createReview(app, user1.accessToken, bar.id, 'Review 1', 5);
        await createReview(app, user2.accessToken, bar.id, 'Review 2', 3);

        const result = await getBarReviews(user1.accessToken, bar.id);

        expect(result.items).toHaveLength(2);
        expect(result.meta.totalItems).toBe(2);
        expect(result.meta.page).toBe(1);
        expect(result.stats.totalCount).toBe(2);
        expect(result.stats.averageRating).toBe(4);
      });

      it('should paginate correctly', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user1 = await signupUser(app, TEST_USER_1);
        const user2 = await signupUser(app, TEST_USER_2);
        const bar = await createApprovedBar(
          app,
          user1.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await createReview(app, user1.accessToken, bar.id, 'Review 1', 5);
        await createReview(app, user2.accessToken, bar.id, 'Review 2', 3);

        const res = await request(app.getHttpServer())
          .get(`/api/v1/bars/${bar.id}/reviews?page=2&limit=1`)
          .set('Cookie', `accessToken=${user1.accessToken}`)
          .expect(200);

        expect(res.body.items).toHaveLength(1);
        expect(res.body.meta.page).toBe(2);
        expect(res.body.meta.totalPages).toBe(2);
      });

      it('should return empty for bar with no reviews', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        const result = await getBarReviews(user.accessToken, bar.id);

        expect(result.items).toHaveLength(0);
        expect(result.stats.totalCount).toBe(0);
      });

      it('should return correct rating distribution', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user1 = await signupUser(app, TEST_USER_1);
        const user2 = await signupUser(app, TEST_USER_2);
        const bar = await createApprovedBar(
          app,
          user1.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        await createReview(app, user1.accessToken, bar.id, 'Five stars', 5);
        await createReview(app, user2.accessToken, bar.id, 'Three stars', 3);

        const result = await getBarReviews(user1.accessToken, bar.id);

        const dist = result.stats.distribution;
        const rating5 = dist.find((d: any) => d.rating === 5);
        const rating3 = dist.find((d: any) => d.rating === 3);
        expect(rating5.count).toBe(1);
        expect(rating3.count).toBe(1);
      });
    });

    describe('가시성', () => {
      it('should exclude non-PUBLISHED reviews for regular user', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        const review = await createReview(app, user.accessToken, bar.id);

        // 관리자가 HIDDEN으로 변경
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'HIDDEN' })
          .expect(200);

        const user2 = await signupUser(app, TEST_USER_2);
        const result = await getBarReviews(user2.accessToken, bar.id);

        expect(result.items).toHaveLength(0);
      });

      it('should include all statuses for admin', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );

        const review = await createReview(app, user.accessToken, bar.id);

        // 관리자가 HIDDEN으로 변경
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'HIDDEN' })
          .expect(200);

        const result = await getBarReviews(admin.accessToken, bar.id);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].status).toBe('HIDDEN');
      });
    });

    describe('오류', () => {
      it('should return 401 without auth', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/bars/1/reviews')
          .expect(401);
      });

      it('should return 404 for non-existent bar', async () => {
        const user = await signupUser(app, TEST_USER_1);

        await request(app.getHttpServer())
          .get('/api/v1/bars/99999/reviews')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .expect(404);
      });

      it('should return 404 for non-APPROVED bar when requester is non-owner non-admin', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const owner = await signupUser(app, TEST_USER_1);
        const other = await signupUser(app, TEST_USER_2);
        const pendingBar = await createBar(app, owner.accessToken, TEST_BAR_DTO);

        await request(app.getHttpServer())
          .get(`/api/v1/bars/${pendingBar.id}/reviews`)
          .set('Cookie', `accessToken=${other.accessToken}`)
          .expect(404);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // GET /api/v1/bars/:barId/my-review — 내 리뷰
  // ─────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/bars/:barId/my-review', () => {
    it('should return current user review', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );

      const review = await createReview(app, user.accessToken, bar.id, 'My review', 4);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}/my-review`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(review.id);
      expect(res.body.content).toBe('My review');
    });

    it('should return null when no review exists', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );

      const res = await request(app.getHttpServer())
        .get(`/api/v1/bars/${bar.id}/my-review`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      // NestJS는 null 반환 시 빈 객체 또는 빈 문자열로 직렬화할 수 있음
      const isEmpty =
        res.body === null ||
        res.body === '' ||
        (typeof res.body === 'object' && Object.keys(res.body).length === 0);
      expect(isEmpty).toBe(true);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bars/1/my-review')
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/reviews/:reviewId — 리뷰 수정
  // ─────────────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/reviews/:reviewId', () => {
    describe('성공', () => {
      it('should update rating and content', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user.accessToken, bar.id, 'Old content', 3);

        const res = await request(app.getHttpServer())
          .patch(`/api/v1/reviews/${review.id}`)
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ rating: 5, content: 'Updated content' })
          .expect(200);

        expect(res.body.rating).toBe(5);
        expect(res.body.content).toBe('Updated content');
      });

      it('should update only rating', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user.accessToken, bar.id, 'Keep this', 3);

        const res = await request(app.getHttpServer())
          .patch(`/api/v1/reviews/${review.id}`)
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ rating: 5 })
          .expect(200);

        expect(res.body.rating).toBe(5);
        expect(res.body.content).toBe('Keep this');
      });

      it('should update only content', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user.accessToken, bar.id, 'Old', 4);

        const res = await request(app.getHttpServer())
          .patch(`/api/v1/reviews/${review.id}`)
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ content: 'New content' })
          .expect(200);

        expect(res.body.content).toBe('New content');
        expect(res.body.rating).toBe(4);
      });

      it('should update visitedAt', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user.accessToken, bar.id);

        const res = await request(app.getHttpServer())
          .patch(`/api/v1/reviews/${review.id}`)
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ visitedAt: '2025-06-15' })
          .expect(200);

        expect(res.body.visitedAt).toContain('2025-06-15');
      });
    });

    describe('오류', () => {
      it('should reject invalid rating', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user.accessToken, bar.id);

        await request(app.getHttpServer())
          .patch(`/api/v1/reviews/${review.id}`)
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ rating: 0 })
          .expect(400);
      });

      it('should return 401 without auth', async () => {
        await request(app.getHttpServer())
          .patch('/api/v1/reviews/1')
          .send({ rating: 5 })
          .expect(401);
      });

      it('should return 403 for non-author', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user1 = await signupUser(app, TEST_USER_1);
        const user2 = await signupUser(app, TEST_USER_2);
        const bar = await createApprovedBar(
          app,
          user1.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user1.accessToken, bar.id);

        await request(app.getHttpServer())
          .patch(`/api/v1/reviews/${review.id}`)
          .set('Cookie', `accessToken=${user2.accessToken}`)
          .send({ rating: 1 })
          .expect(403);
      });

      it('should return 404 for non-existent review', async () => {
        const user = await signupUser(app, TEST_USER_1);

        await request(app.getHttpServer())
          .patch('/api/v1/reviews/99999')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ rating: 5 })
          .expect(404);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // DELETE /api/v1/reviews/:reviewId — 리뷰 삭제
  // ─────────────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/reviews/:reviewId', () => {
    it('should soft-delete own review', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${review.id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(204);

      // 삭제 후 목록에서 미포함
      const result = await getBarReviews(user.accessToken, bar.id);
      expect(result.items).toHaveLength(0);
    });

    it('should soft-delete associated photos', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);
      await uploadReviewPhoto(user.accessToken, review.id, FIXTURE_IMAGE);

      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${review.id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(204);

      // 삭제 후 목록에서 리뷰+사진 모두 미포함
      const result = await getBarReviews(user.accessToken, bar.id);
      expect(result.items).toHaveLength(0);
    });

    it('should decrement bar review stats', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id, 'To delete', 5);

      const before = await getBarReviews(user.accessToken, bar.id);
      expect(before.stats.totalCount).toBe(1);

      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${review.id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(204);

      const after = await getBarReviews(user.accessToken, bar.id);
      expect(after.stats.totalCount).toBe(0);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/reviews/1')
        .expect(401);
    });

    it('should return 403 for non-author', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user1 = await signupUser(app, TEST_USER_1);
      const user2 = await signupUser(app, TEST_USER_2);
      const bar = await createApprovedBar(
        app,
        user1.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user1.accessToken, bar.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${review.id}`)
        .set('Cookie', `accessToken=${user2.accessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent review', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .delete('/api/v1/reviews/99999')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // POST /api/v1/reviews/:reviewId/photos — 리뷰 사진 업로드
  // ─────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/reviews/:reviewId/photos', () => {
    it('should upload a single photo', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);

      const photos = await uploadReviewPhoto(
        user.accessToken,
        review.id,
        FIXTURE_IMAGE,
      );

      expect(photos).toHaveLength(1);
      expect(photos[0].url).toBeDefined();
      expect(photos[0].id).toBeDefined();
    });

    it('should upload multiple photos', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/photos`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('files', FIXTURE_IMAGE)
        .attach('files', FIXTURE_PNG)
        .expect(201);

      expect(res.body).toHaveLength(2);
    });

    it('should reject when exceeding 5 photos', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);

      // 5장 업로드
      for (let i = 0; i < 5; i++) {
        await uploadReviewPhoto(user.accessToken, review.id, FIXTURE_IMAGE);
      }

      // 6번째 → 400
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/photos`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('files', FIXTURE_IMAGE)
        .expect(400);
    });

    it('should reject non-image file', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);

      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/photos`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('files', FIXTURE_TXT)
        .expect(400);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews/1/photos')
        .attach('files', FIXTURE_IMAGE)
        .expect(401);
    });

    it('should return 403 for non-author', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user1 = await signupUser(app, TEST_USER_1);
      const user2 = await signupUser(app, TEST_USER_2);
      const bar = await createApprovedBar(
        app,
        user1.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user1.accessToken, bar.id);

      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/photos`)
        .set('Cookie', `accessToken=${user2.accessToken}`)
        .attach('files', FIXTURE_IMAGE)
        .expect(403);
    });

    it('should return 404 for non-existent review', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/reviews/99999/photos')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('files', FIXTURE_IMAGE)
        .expect(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // DELETE /api/v1/reviews/:reviewId/photos/:photoId — 리뷰 사진 삭제
  // ─────────────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/reviews/:reviewId/photos/:photoId', () => {
    it('should delete photo and return 204', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);
      const photos = await uploadReviewPhoto(
        user.accessToken,
        review.id,
        FIXTURE_IMAGE,
      );

      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${review.id}/photos/${photos[0].id}`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(204);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/reviews/1/photos/1')
        .expect(401);
    });

    it('should return 403 for non-author', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user1 = await signupUser(app, TEST_USER_1);
      const user2 = await signupUser(app, TEST_USER_2);
      const bar = await createApprovedBar(
        app,
        user1.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user1.accessToken, bar.id);
      const photos = await uploadReviewPhoto(
        user1.accessToken,
        review.id,
        FIXTURE_IMAGE,
      );

      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${review.id}/photos/${photos[0].id}`)
        .set('Cookie', `accessToken=${user2.accessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent review', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .delete('/api/v1/reviews/99999/photos/1')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent photo', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/reviews/${review.id}/photos/99999`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // PATCH /api/v1/admin/reviews/:reviewId/status — 관리자 리뷰 상태 변경
  // ─────────────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/admin/reviews/:reviewId/status', () => {
    describe('성공 + 통계', () => {
      it('should change PUBLISHED to HIDDEN', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user.accessToken, bar.id);

        const res = await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'HIDDEN' })
          .expect(200);

        expect(res.body.status).toBe('HIDDEN');
      });

      it('should change HIDDEN to PUBLISHED', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user.accessToken, bar.id);

        // HIDDEN으로 변경
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'HIDDEN' })
          .expect(200);

        // PUBLISHED로 복구
        const res = await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'PUBLISHED' })
          .expect(200);

        expect(res.body.status).toBe('PUBLISHED');
      });

      it('should decrement stats when hiding', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        await createReview(app, user.accessToken, bar.id, 'Visible', 5);

        const before = await getBarReviews(user.accessToken, bar.id);
        expect(before.stats.totalCount).toBe(1);

        const review = before.items[0];
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'HIDDEN' })
          .expect(200);

        const after = await getBarReviews(user.accessToken, bar.id);
        expect(after.stats.totalCount).toBe(0);
      });

      it('should increment stats when restoring', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user.accessToken, bar.id, 'Test', 4);

        // HIDDEN으로 변경 → 통계 차감
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'HIDDEN' })
          .expect(200);

        const hidden = await getBarReviews(user.accessToken, bar.id);
        expect(hidden.stats.totalCount).toBe(0);

        // PUBLISHED로 복구 → 통계 복구
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'PUBLISHED' })
          .expect(200);

        const restored = await getBarReviews(user.accessToken, bar.id);
        expect(restored.stats.totalCount).toBe(1);
      });
    });

    describe('오류', () => {
      it('should return 409 for same status', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const user = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(
          app,
          user.accessToken,
          admin.accessToken,
          TEST_BAR_DTO,
        );
        const review = await createReview(app, user.accessToken, bar.id);

        const res = await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'PUBLISHED' })
          .expect(409);

        expect(res.body.message).toBeDefined();
      });

      it('should reject invalid status value', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);

        await request(app.getHttpServer())
          .patch('/api/v1/admin/reviews/1/status')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'INVALID_STATUS' })
          .expect(400);
      });

      it('should return 401 without auth', async () => {
        await request(app.getHttpServer())
          .patch('/api/v1/admin/reviews/1/status')
          .send({ status: 'HIDDEN' })
          .expect(401);
      });

      it('should return 403 for non-admin', async () => {
        const user = await signupUser(app, TEST_USER_1);

        await request(app.getHttpServer())
          .patch('/api/v1/admin/reviews/1/status')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ status: 'HIDDEN' })
          .expect(403);
      });

      it('should return 404 for non-existent review', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);

        await request(app.getHttpServer())
          .patch('/api/v1/admin/reviews/99999/status')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'HIDDEN' })
          .expect(404);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // DELETE /api/v1/admin/reviews/:reviewId — 관리자 리뷰 삭제
  // ─────────────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/admin/reviews/:reviewId', () => {
    it('should admin-delete review', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/reviews/${review.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({})
        .expect(204);

      // 삭제 후 목록에서 미포함
      const result = await getBarReviews(user.accessToken, bar.id);
      expect(result.items).toHaveLength(0);
    });

    it('should accept optional reason', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/reviews/${review.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Violates policy' })
        .expect(204);
    });

    it('should reject reason exceeding 500 chars', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(
        app,
        user.accessToken,
        admin.accessToken,
        TEST_BAR_DTO,
      );
      const review = await createReview(app, user.accessToken, bar.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/reviews/${review.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'a'.repeat(501) })
        .expect(400);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/admin/reviews/1')
        .send({})
        .expect(401);
    });

    it('should return 403 for non-admin', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .delete('/api/v1/admin/reviews/1')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({})
        .expect(403);
    });

    it('should return 404 for non-existent review', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .delete('/api/v1/admin/reviews/99999')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({})
        .expect(404);
    });
  });
});
