import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import {
  createTestApp,
  signupUser,
  createAdminUser,
  createApprovedBar,
  createReview,
} from './e2e-test-helper';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';
import { TEST_USER_1, TEST_USER_2, TEST_ADMIN, TEST_BAR_DTO } from './test-constants';

describe('Review Reports (e2e)', () => {
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
   * 바 리뷰 통계를 조회하는 헬퍼.
   */
  async function getBarReviews(token: string, barId: number) {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/bars/${barId}/reviews`)
      .set('Cookie', `accessToken=${token}`)
      .expect(200);
    return res.body;
  }

  /**
   * 신고를 접수하고 report를 반환하는 헬퍼.
   */
  async function submitReport(
    token: string,
    reviewId: number,
    reason = 'SPAM',
    detail?: string,
  ) {
    const body: Record<string, string> = { reason };
    if (detail !== undefined) body.detail = detail;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/report`)
      .set('Cookie', `accessToken=${token}`)
      .send(body)
      .expect(201);
    return res.body;
  }

  /**
   * 테스트용 공통 셋업: admin + author + reporter + approved bar + review.
   */
  async function setupReportScenario() {
    const admin = await createAdminUser(app, TEST_ADMIN);
    const author = await signupUser(app, TEST_USER_1);
    const reporter = await signupUser(app, TEST_USER_2);
    const bar = await createApprovedBar(app, author.accessToken, admin.accessToken, TEST_BAR_DTO);
    const review = await createReview(app, author.accessToken, bar.id);
    return { admin, author, reporter, bar, review };
  }

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/reviews/:reviewId/report — 신고 접수
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /api/v1/reviews/:reviewId/report', () => {
    describe('성공', () => {
      it('should create a report with reason only', async () => {
        const { reporter, review } = await setupReportScenario();

        const res = await request(app.getHttpServer())
          .post(`/api/v1/reviews/${review.id}/report`)
          .set('Cookie', `accessToken=${reporter.accessToken}`)
          .send({ reason: 'SPAM' })
          .expect(201);

        expect(res.body).toMatchObject({
          reviewId: review.id,
          status: 'REPORTED',
        });
        expect(res.body.reportId).toBeDefined();
      });

      it('should create a report with detail', async () => {
        const { reporter, review } = await setupReportScenario();

        const res = await request(app.getHttpServer())
          .post(`/api/v1/reviews/${review.id}/report`)
          .set('Cookie', `accessToken=${reporter.accessToken}`)
          .send({ reason: 'OTHER', detail: 'This review is misleading.' })
          .expect(201);

        expect(res.body.status).toBe('REPORTED');
      });
    });

    describe('유효성 검증 (400)', () => {
      it('should reject invalid reason enum', async () => {
        const { reporter, review } = await setupReportScenario();

        await request(app.getHttpServer())
          .post(`/api/v1/reviews/${review.id}/report`)
          .set('Cookie', `accessToken=${reporter.accessToken}`)
          .send({ reason: 'INVALID_REASON' })
          .expect(400);
      });

      it('should reject detail exceeding 1000 chars', async () => {
        const { reporter, review } = await setupReportScenario();

        await request(app.getHttpServer())
          .post(`/api/v1/reviews/${review.id}/report`)
          .set('Cookie', `accessToken=${reporter.accessToken}`)
          .send({ reason: 'SPAM', detail: 'x'.repeat(1001) })
          .expect(400);
      });
    });

    describe('인증/권한/비즈니스 규칙', () => {
      it('should return 401 without auth', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/reviews/999/report')
          .send({ reason: 'SPAM' })
          .expect(401);
      });

      it('should return 403 for self-report', async () => {
        const { author, review } = await setupReportScenario();

        await request(app.getHttpServer())
          .post(`/api/v1/reviews/${review.id}/report`)
          .set('Cookie', `accessToken=${author.accessToken}`)
          .send({ reason: 'SPAM' })
          .expect(403);
      });

      it('should return 404 for non-existent review', async () => {
        const { reporter } = await setupReportScenario();

        await request(app.getHttpServer())
          .post('/api/v1/reviews/999999/report')
          .set('Cookie', `accessToken=${reporter.accessToken}`)
          .send({ reason: 'SPAM' })
          .expect(404);
      });

      it('should return 404 for HIDDEN review', async () => {
        const { admin, reporter, review } = await setupReportScenario();

        // 관리자가 리뷰를 HIDDEN으로 변경
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/reviews/${review.id}/status`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ status: 'HIDDEN' })
          .expect(200);

        await request(app.getHttpServer())
          .post(`/api/v1/reviews/${review.id}/report`)
          .set('Cookie', `accessToken=${reporter.accessToken}`)
          .send({ reason: 'SPAM' })
          .expect(404);
      });

      it('should return 409 for duplicate report', async () => {
        const { reporter, review } = await setupReportScenario();

        await request(app.getHttpServer())
          .post(`/api/v1/reviews/${review.id}/report`)
          .set('Cookie', `accessToken=${reporter.accessToken}`)
          .send({ reason: 'SPAM' })
          .expect(201);

        await request(app.getHttpServer())
          .post(`/api/v1/reviews/${review.id}/report`)
          .set('Cookie', `accessToken=${reporter.accessToken}`)
          .send({ reason: 'MISINFORMATION' })
          .expect(409);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/admin/review-reports — 관리자 목록 조회
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/admin/review-reports', () => {
    describe('성공', () => {
      it('should return report list with pagination meta', async () => {
        const { admin, reporter, review } = await setupReportScenario();
        await submitReport(reporter.accessToken, review.id);

        const res = await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);

        expect(res.body.items).toHaveLength(1);
        expect(res.body.meta).toMatchObject({
          page: 1,
          totalItems: 1,
        });
      });

      it('should filter by PENDING status', async () => {
        const { admin, reporter, review } = await setupReportScenario();
        await submitReport(reporter.accessToken, review.id);

        const res = await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports?status=PENDING')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);

        expect(res.body.items.length).toBeGreaterThanOrEqual(1);
        expect(res.body.items.every((r: any) => r.status === 'PENDING')).toBe(true);
      });

      it('should filter by RESOLVED status', async () => {
        const { admin, reporter, review } = await setupReportScenario();
        await submitReport(reporter.accessToken, review.id);

        // resolve
        const list = await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .patch(`/api/v1/admin/review-reports/${list.body.items[0].id}/resolve`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ action: 'RESTORED' })
          .expect(200);

        const res = await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports?status=RESOLVED')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);

        expect(res.body.items.length).toBeGreaterThanOrEqual(1);
        expect(res.body.items.every((r: any) => r.status === 'RESOLVED')).toBe(true);
      });

      it('should paginate correctly', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);
        const author = await signupUser(app, TEST_USER_1);
        const bar = await createApprovedBar(app, author.accessToken, admin.accessToken, TEST_BAR_DTO);

        // 리뷰 2개 + 각각 신고
        const review1 = await createReview(app, author.accessToken, bar.id, 'Review 1', 4);

        const reporter1 = await signupUser(app, {
          email: 'reporter-a@test.com',
          password: 'Test1234!',
          name: 'ReporterA',
        });
        const reporter2 = await signupUser(app, {
          email: 'reporter-b@test.com',
          password: 'Test1234!',
          name: 'ReporterB',
        });

        await submitReport(reporter1.accessToken, review1.id, 'SPAM');
        await submitReport(reporter2.accessToken, review1.id, 'MISINFORMATION');

        const res = await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports?page=1&limit=1')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);

        expect(res.body.items).toHaveLength(1);
        expect(res.body.meta.totalItems).toBe(2);
        expect(res.body.meta.totalPages).toBe(2);
      });
    });

    describe('오류', () => {
      it('should return 401 without auth', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports')
          .expect(401);
      });

      it('should return 403 for non-admin', async () => {
        const user = await signupUser(app, TEST_USER_1);

        await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .expect(403);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/admin/review-reports/:reportId — 관리자 상세 조회
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /api/v1/admin/review-reports/:reportId', () => {
    describe('성공', () => {
      it('should return report detail with review and reporter info', async () => {
        const { admin, reporter, review } = await setupReportScenario();
        await submitReport(reporter.accessToken, review.id, 'SPAM', 'Test detail');

        const list = await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);

        const reportId = list.body.items[0].id;

        const res = await request(app.getHttpServer())
          .get(`/api/v1/admin/review-reports/${reportId}`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);

        expect(res.body.id).toBe(reportId);
        expect(res.body.reason).toBe('SPAM');
        expect(res.body.status).toBe('PENDING');
        expect(res.body.reporter).toBeDefined();
        expect(res.body.review).toBeDefined();
      });
    });

    describe('오류', () => {
      it('should return 401 without auth', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports/999')
          .expect(401);
      });

      it('should return 403 for non-admin', async () => {
        const user = await signupUser(app, TEST_USER_1);

        await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports/999')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .expect(403);
      });

      it('should return 404 for non-existent report', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);

        await request(app.getHttpServer())
          .get('/api/v1/admin/review-reports/999999')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(404);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/admin/review-reports/:reportId/resolve — 관리자 처리
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /api/v1/admin/review-reports/:reportId/resolve', () => {
    /**
     * 신고를 접수하고 reportId를 반환하는 헬퍼.
     */
    async function setupPendingReport() {
      const { admin, author, reporter, bar, review } = await setupReportScenario();
      await submitReport(reporter.accessToken, review.id, 'SPAM');

      const list = await request(app.getHttpServer())
        .get('/api/v1/admin/review-reports')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const reportId = list.body.items[0].id;
      return { admin, author, reporter, bar, review, reportId };
    }

    describe('성공', () => {
      it('should resolve with HIDDEN action', async () => {
        const { admin, reporter, bar, reportId } = await setupPendingReport();

        await request(app.getHttpServer())
          .patch(`/api/v1/admin/review-reports/${reportId}/resolve`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ action: 'HIDDEN', note: 'Content violates policy' })
          .expect(200);

        // report가 RESOLVED + resolution HIDDEN
        const detail = await request(app.getHttpServer())
          .get(`/api/v1/admin/review-reports/${reportId}`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);

        expect(detail.body.status).toBe('RESOLVED');
        expect(detail.body.resolution).toBe('HIDDEN');

        // 리뷰가 일반 사용자 목록에서 숨겨짐
        const reviews = await getBarReviews(reporter.accessToken, bar.id);
        expect(reviews.items).toHaveLength(0);
        expect(reviews.stats.totalCount).toBe(0);
      });

      it('should accept optional note', async () => {
        const { admin, reportId } = await setupPendingReport();

        await request(app.getHttpServer())
          .patch(`/api/v1/admin/review-reports/${reportId}/resolve`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ action: 'RESTORED', note: 'False alarm' })
          .expect(200);

        const detail = await request(app.getHttpServer())
          .get(`/api/v1/admin/review-reports/${reportId}`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);

        expect(detail.body.resolutionNote).toBe('False alarm');
      });
    });

    describe('유효성 검증 (400)', () => {
      it('should reject invalid action enum', async () => {
        const { admin, reportId } = await setupPendingReport();

        await request(app.getHttpServer())
          .patch(`/api/v1/admin/review-reports/${reportId}/resolve`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ action: 'INVALID_ACTION' })
          .expect(400);
      });

      it('should reject note exceeding 1000 chars', async () => {
        const { admin, reportId } = await setupPendingReport();

        await request(app.getHttpServer())
          .patch(`/api/v1/admin/review-reports/${reportId}/resolve`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ action: 'RESTORED', note: 'x'.repeat(1001) })
          .expect(400);
      });
    });

    describe('오류', () => {
      it('should return 401 without auth', async () => {
        await request(app.getHttpServer())
          .patch('/api/v1/admin/review-reports/999/resolve')
          .send({ action: 'RESTORED' })
          .expect(401);
      });

      it('should return 403 for non-admin', async () => {
        const user = await signupUser(app, TEST_USER_1);

        await request(app.getHttpServer())
          .patch('/api/v1/admin/review-reports/999/resolve')
          .set('Cookie', `accessToken=${user.accessToken}`)
          .send({ action: 'RESTORED' })
          .expect(403);
      });

      it('should return 404 for non-existent report', async () => {
        const admin = await createAdminUser(app, TEST_ADMIN);

        await request(app.getHttpServer())
          .patch('/api/v1/admin/review-reports/999999/resolve')
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ action: 'RESTORED' })
          .expect(404);
      });

      it('should return 409 for already resolved report', async () => {
        const { admin, reportId } = await setupPendingReport();

        // 1차 처리
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/review-reports/${reportId}/resolve`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ action: 'RESTORED' })
          .expect(200);

        // 2차 처리 → 409
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/review-reports/${reportId}/resolve`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .send({ action: 'HIDDEN' })
          .expect(409);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 통합 시나리오 (엔드 투 엔드 플로우)
  // ═══════════════════════════════════════════════════════════════════

  describe('통합 시나리오', () => {
    it('신고 후 관리자가 RESTORE하면 리뷰가 PUBLISHED로 복구되고 가시성+집계가 복원된다', async () => {
      const admin = await createAdminUser(app, {
        email: 'admin1@test.com',
        password: 'Admin1234!',
        name: 'Admin',
      });
      const author = await signupUser(app, {
        email: 'author1@test.com',
        password: 'Test1234!',
        name: 'Author',
      });
      const reporter = await signupUser(app, {
        email: 'reporter1@test.com',
        password: 'Test1234!',
        name: 'Reporter',
      });

      const bar = await createApprovedBar(
        app,
        author.accessToken,
        admin.accessToken,
        {
          name: 'Test Bar 1',
          description: 'Description',
          address: 'Seoul',
          city: 'Seoul',
          country: 'South Korea',
          latitude: 37.5,
          longitude: 127.0,
        },
      );

      const review = await createReview(app, author.accessToken, bar.id);

      // 신고 전 집계 확인
      const beforeReport = await getBarReviews(reporter.accessToken, bar.id);
      expect(beforeReport.stats.totalCount).toBe(1);

      // 신고 접수
      const reportRes = await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/report`)
        .set('Cookie', `accessToken=${reporter.accessToken}`)
        .send({ reason: 'SPAM', detail: 'Spam review' })
        .expect(201);

      expect(reportRes.body.status).toBe('REPORTED');

      // 신고 후: 일반 사용자 목록에서 사라짐 + 집계 제외
      const afterReport = await getBarReviews(reporter.accessToken, bar.id);
      expect(afterReport.items.length).toBe(0);
      expect(afterReport.stats.totalCount).toBe(0);

      // 관리자 신고 목록 조회
      const reportsRes = await request(app.getHttpServer())
        .get('/api/v1/admin/review-reports')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(reportsRes.body.items.length).toBeGreaterThanOrEqual(1);
      const reportItem = reportsRes.body.items[0];

      // 관리자 RESTORE
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/review-reports/${reportItem.id}/resolve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ action: 'RESTORED', note: 'False positive' })
        .expect(200);

      // RESTORE 후: 리뷰 다시 보임 + 집계 복구
      const afterRestore = await getBarReviews(reporter.accessToken, bar.id);
      expect(afterRestore.items.length).toBe(1);
      expect(afterRestore.stats.totalCount).toBe(1);
    });

    it('신고 후 관리자가 DELETE하면 리뷰가 삭제되고 report는 RESOLVED로 유지된다', async () => {
      const admin = await createAdminUser(app, {
        email: 'admin2@test.com',
        password: 'Admin1234!',
        name: 'Admin2',
      });
      const author = await signupUser(app, {
        email: 'author2@test.com',
        password: 'Test1234!',
        name: 'Author2',
      });
      const reporter = await signupUser(app, {
        email: 'reporter2@test.com',
        password: 'Test1234!',
        name: 'Reporter2',
      });

      const bar = await createApprovedBar(
        app,
        author.accessToken,
        admin.accessToken,
        {
          name: 'Test Bar 2',
          description: 'Description',
          address: 'Seoul',
          city: 'Seoul',
          country: 'South Korea',
          latitude: 37.5,
          longitude: 127.0,
        },
      );

      const review = await createReview(app, author.accessToken, bar.id);

      // 신고
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/report`)
        .set('Cookie', `accessToken=${reporter.accessToken}`)
        .send({ reason: 'ABUSIVE_OR_HATEFUL' })
        .expect(201);

      // 관리자 DELETE
      const reportsRes = await request(app.getHttpServer())
        .get('/api/v1/admin/review-reports')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const reportItem = reportsRes.body.items[0];

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/review-reports/${reportItem.id}/resolve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ action: 'DELETED', note: 'Confirmed abusive' })
        .expect(200);

      // report 상태 확인 (RESOLVED)
      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/review-reports/${reportItem.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(detailRes.body.status).toBe('RESOLVED');
      expect(detailRes.body.resolution).toBe('DELETED');
    });

    it('동일 사용자가 같은 리뷰를 두 번 신고하면 409를 반환한다', async () => {
      const admin = await createAdminUser(app, {
        email: 'admin3@test.com',
        password: 'Admin1234!',
        name: 'Admin3',
      });
      const author = await signupUser(app, {
        email: 'author3@test.com',
        password: 'Test1234!',
        name: 'Author3',
      });
      const reporter = await signupUser(app, {
        email: 'reporter3@test.com',
        password: 'Test1234!',
        name: 'Reporter3',
      });

      const bar = await createApprovedBar(
        app,
        author.accessToken,
        admin.accessToken,
        {
          name: 'Test Bar 3',
          description: 'Description',
          address: 'Seoul',
          city: 'Seoul',
          country: 'South Korea',
          latitude: 37.5,
          longitude: 127.0,
        },
      );

      const review = await createReview(app, author.accessToken, bar.id);

      // 첫 번째 신고: 성공
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/report`)
        .set('Cookie', `accessToken=${reporter.accessToken}`)
        .send({ reason: 'SPAM' })
        .expect(201);

      // 두 번째 신고: 409
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/report`)
        .set('Cookie', `accessToken=${reporter.accessToken}`)
        .send({ reason: 'MISINFORMATION' })
        .expect(409);
    });

    it('이미 REPORTED인 리뷰에 다른 사용자가 신고해도 집계가 중복 차감되지 않는다', async () => {
      const admin = await createAdminUser(app, {
        email: 'admin4@test.com',
        password: 'Admin1234!',
        name: 'Admin4',
      });
      const author = await signupUser(app, {
        email: 'author4@test.com',
        password: 'Test1234!',
        name: 'Author4',
      });
      const reporter1 = await signupUser(app, {
        email: 'reporter4a@test.com',
        password: 'Test1234!',
        name: 'Reporter4a',
      });
      const reporter2 = await signupUser(app, {
        email: 'reporter4b@test.com',
        password: 'Test1234!',
        name: 'Reporter4b',
      });

      const bar = await createApprovedBar(
        app,
        author.accessToken,
        admin.accessToken,
        {
          name: 'Test Bar 4',
          description: 'Description',
          address: 'Seoul',
          city: 'Seoul',
          country: 'South Korea',
          latitude: 37.5,
          longitude: 127.0,
        },
      );

      // 리뷰 생성
      await createReview(app, author.accessToken, bar.id, 'Review 1', 5);

      // reporter1이 신고 → PUBLISHED → REPORTED (집계 1→0)
      const reviews = await getBarReviews(reporter1.accessToken, bar.id);
      const reviewId = reviews.items[0].id;

      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/report`)
        .set('Cookie', `accessToken=${reporter1.accessToken}`)
        .send({ reason: 'SPAM' })
        .expect(201);

      // reporter2가 같은 리뷰 신고 → 이미 REPORTED → 집계 변동 없음
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${reviewId}/report`)
        .set('Cookie', `accessToken=${reporter2.accessToken}`)
        .send({ reason: 'MISINFORMATION' })
        .expect(201);

      // 집계 확인: 0 (한 번만 차감)
      const afterBothReports = await getBarReviews(reporter1.accessToken, bar.id);
      expect(afterBothReports.stats.totalCount).toBe(0);
    });

    it('신고된 리뷰는 일반 사용자 리뷰 목록에 포함되지 않는다', async () => {
      const admin = await createAdminUser(app, {
        email: 'admin5@test.com',
        password: 'Admin1234!',
        name: 'Admin5',
      });
      const author = await signupUser(app, {
        email: 'author5@test.com',
        password: 'Test1234!',
        name: 'Author5',
      });
      const reporter = await signupUser(app, {
        email: 'reporter5@test.com',
        password: 'Test1234!',
        name: 'Reporter5',
      });

      const bar = await createApprovedBar(
        app,
        author.accessToken,
        admin.accessToken,
        {
          name: 'Test Bar 5',
          description: 'Description',
          address: 'Seoul',
          city: 'Seoul',
          country: 'South Korea',
          latitude: 37.5,
          longitude: 127.0,
        },
      );

      const review = await createReview(app, author.accessToken, bar.id);

      // 신고 전: 리뷰 1개 보임
      const before = await getBarReviews(reporter.accessToken, bar.id);
      expect(before.items.some((r: any) => r.id === review.id)).toBe(true);

      // 신고
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/report`)
        .set('Cookie', `accessToken=${reporter.accessToken}`)
        .send({ reason: 'SPAM' })
        .expect(201);

      // 신고 후: 해당 리뷰 미포함
      const after = await getBarReviews(reporter.accessToken, bar.id);
      expect(after.items.some((r: any) => r.id === review.id)).toBe(false);
    });

    it('신고된 리뷰는 일반 사용자 집계에서 제외된다', async () => {
      const admin = await createAdminUser(app, {
        email: 'admin6@test.com',
        password: 'Admin1234!',
        name: 'Admin6',
      });
      const author = await signupUser(app, {
        email: 'author6@test.com',
        password: 'Test1234!',
        name: 'Author6',
      });
      const reporter = await signupUser(app, {
        email: 'reporter6@test.com',
        password: 'Test1234!',
        name: 'Reporter6',
      });

      const bar = await createApprovedBar(
        app,
        author.accessToken,
        admin.accessToken,
        {
          name: 'Test Bar 6',
          description: 'Description',
          address: 'Seoul',
          city: 'Seoul',
          country: 'South Korea',
          latitude: 37.5,
          longitude: 127.0,
        },
      );

      await createReview(app, author.accessToken, bar.id, 'Good bar', 5);

      // 신고 전 집계
      const before = await getBarReviews(reporter.accessToken, bar.id);
      expect(before.stats.totalCount).toBe(1);
      expect(before.stats.averageRating).toBe(5);

      // 신고
      const review = before.items[0];
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/report`)
        .set('Cookie', `accessToken=${reporter.accessToken}`)
        .send({ reason: 'MISINFORMATION' })
        .expect(201);

      // 신고 후 집계: 리뷰 0개
      const after = await getBarReviews(reporter.accessToken, bar.id);
      expect(after.stats.totalCount).toBe(0);
    });

    it('기존 admin API로 리뷰 상태가 이미 변경된 경우에도 resolve로 report를 정리할 수 있다', async () => {
      const admin = await createAdminUser(app, {
        email: 'admin7@test.com',
        password: 'Admin1234!',
        name: 'Admin7',
      });
      const author = await signupUser(app, {
        email: 'author7@test.com',
        password: 'Test1234!',
        name: 'Author7',
      });
      const reporter = await signupUser(app, {
        email: 'reporter7@test.com',
        password: 'Test1234!',
        name: 'Reporter7',
      });

      const bar = await createApprovedBar(
        app,
        author.accessToken,
        admin.accessToken,
        {
          name: 'Test Bar 7',
          description: 'Description',
          address: 'Seoul',
          city: 'Seoul',
          country: 'South Korea',
          latitude: 37.5,
          longitude: 127.0,
        },
      );

      const review = await createReview(app, author.accessToken, bar.id);

      // 신고
      await request(app.getHttpServer())
        .post(`/api/v1/reviews/${review.id}/report`)
        .set('Cookie', `accessToken=${reporter.accessToken}`)
        .send({ reason: 'SPAM' })
        .expect(201);

      // 기존 admin API로 먼저 PUBLISHED로 복구
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/reviews/${review.id}/status`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ status: 'PUBLISHED' })
        .expect(200);

      // resolve로 report 정리 (리뷰는 이미 PUBLISHED → moderation skip)
      const reportsRes = await request(app.getHttpServer())
        .get('/api/v1/admin/review-reports')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const reportItem = reportsRes.body.items.find(
        (r: any) => r.reviewId === review.id,
      );

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/review-reports/${reportItem.id}/resolve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ action: 'RESTORED', note: 'Already restored' })
        .expect(200);

      // report가 RESOLVED됨
      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/admin/review-reports/${reportItem.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(detailRes.body.status).toBe('RESOLVED');
    });
  });
});
