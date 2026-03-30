import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ReviewReportsController } from './review-reports.controller.js';
import { ReviewReportsService } from './review-reports.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Role, ReportReason, ReportStatus, ReportResolution } from '@my-project/shared';

// ─── 공통 픽스처 ────────────────────────────────────────────────────────────

const currentUser = { id: 1, email: 'test@example.com', role: Role.USER };
const adminUser = { id: 7, email: 'admin@example.com', role: Role.ADMIN };

/** 성공 응답으로 반환될 신고 접수 결과 */
const mockReportResult = {
  id: 100,
  reviewId: 1,
  reporterUserId: 1,
  reason: ReportReason.SPAM,
  detail: '광고성 게시글입니다',
  status: ReportStatus.PENDING,
  createdAt: new Date().toISOString(),
};

/** 관리자용 신고 목록 결과 픽스처 */
const mockReportListResult = {
  items: [mockReportResult],
  meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
};

/** 관리자용 신고 상세 결과 픽스처 */
const mockReportDetailResult = {
  ...mockReportResult,
  review: {
    id: 1,
    content: '리뷰 내용',
    rating: 4,
    user: { id: 99, name: 'Author' },
  },
  reporter: { id: 1, name: 'Reporter', email: 'test@example.com' },
};

/** resolveReport 성공 결과 픽스처 */
const mockResolveResult = {
  reportId: 100,
  resolution: ReportResolution.RESTORED,
  processedAt: new Date().toISOString(),
};

// ─── describe ───────────────────────────────────────────────────────────────

describe('ReviewReportsController', () => {
  let app: INestApplication;
  let reviewReportsService: {
    submitReport: jest.Mock;
    findReports: jest.Mock;
    findReportById: jest.Mock;
    resolveReport: jest.Mock;
  };

  /**
   * 현재 요청의 Authorization 헤더 값에 따라 사용자를 주입한다.
   * - 'Bearer admin-token': 관리자 (role=ADMIN)
   * - 'Bearer valid-token': 일반 사용자 (role=USER)
   * - 헤더 없음: 인증 실패 (UnauthorizedException)
   */
  const jwtGuardMock = {
    canActivate: (context: any) => {
      const req = context.switchToHttp().getRequest();
      if (!req.headers.authorization) {
        throw new UnauthorizedException();
      }
      if (req.headers.authorization === 'Bearer admin-token') {
        req.user = adminUser;
      } else {
        req.user = currentUser;
      }
      return true;
    },
  };

  beforeAll(async () => {
    reviewReportsService = {
      submitReport: jest.fn().mockResolvedValue(mockReportResult),
      findReports: jest.fn().mockResolvedValue(mockReportListResult),
      findReportById: jest.fn().mockResolvedValue(mockReportDetailResult),
      resolveReport: jest.fn().mockResolvedValue(mockResolveResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewReportsController],
      providers: [
        { provide: ReviewReportsService, useValue: reviewReportsService },
        { provide: APP_GUARD, useValue: jwtGuardMock },
        Reflector,
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({
        /**
         * req.user.role이 ADMIN이면 통과, 그 외는 ForbiddenException을 던진다.
         * 핸들러에 @Roles(Role.ADMIN)이 지정된 경우에만 역할을 검사한다.
         * 여기서는 관리자 엔드포인트 전용 가드 mock이므로 항상 역할을 검사한다.
         */
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          if (req.user?.role !== Role.ADMIN) {
            throw new ForbiddenException('Access denied.');
          }
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/v1/reviews/:reviewId/report ──────────────────────────────

  describe('POST /api/v1/reviews/:reviewId/report', () => {
    const validDto = {
      reason: ReportReason.SPAM,
      detail: '광고성 게시글입니다',
    };

    /**
     * TC-1: 유효한 body로 신고 접수 성공 → 201
     */
    it('유효한 body로 신고하면 201을 반환한다', async () => {
      // Arrange
      reviewReportsService.submitReport.mockResolvedValue(mockReportResult);

      // Act & Assert
      const res = await request(app.getHttpServer())
        .post('/api/v1/reviews/1/report')
        .set('Authorization', 'Bearer valid-token')
        .send(validDto)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe(ReportStatus.PENDING);
      expect(reviewReportsService.submitReport).toHaveBeenCalledWith(
        1,
        currentUser.id,
        expect.objectContaining({ reason: ReportReason.SPAM }),
      );
    });

    /**
     * TC-2: Authorization 헤더 없음 → 401
     */
    it('인증 토큰 없이 신고하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews/1/report')
        .send(validDto)
        .expect(401);

      expect(reviewReportsService.submitReport).not.toHaveBeenCalled();
    });

    /**
     * TC-3: reason 누락 → DTO 검증 실패 → 400
     */
    it('reason이 없으면 400 DTO 검증 오류를 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews/1/report')
        .set('Authorization', 'Bearer valid-token')
        .send({ detail: '신고 사유 없음' })
        .expect(400);

      expect(reviewReportsService.submitReport).not.toHaveBeenCalled();
    });

    /**
     * TC-4: reason이 유효하지 않은 enum 값 → DTO 검증 실패 → 400
     */
    it('reason이 유효하지 않은 enum 값이면 400 DTO 검증 오류를 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews/1/report')
        .set('Authorization', 'Bearer valid-token')
        .send({ reason: 'INVALID_REASON', detail: '잘못된 이유' })
        .expect(400);

      expect(reviewReportsService.submitReport).not.toHaveBeenCalled();
    });

    /**
     * TC-5: detail 없이 reason만 있어도 성공 → 201
     */
    it('detail 없이 reason만 있어도 신고 접수에 성공한다', async () => {
      reviewReportsService.submitReport.mockResolvedValue({
        ...mockReportResult,
        detail: null,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/reviews/1/report')
        .set('Authorization', 'Bearer valid-token')
        .send({ reason: ReportReason.ABUSIVE_OR_HATEFUL })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    /**
     * TC-6: 본인 리뷰 신고 → 서비스에서 ForbiddenException → 403
     */
    it('본인 리뷰를 신고하면 403을 반환한다', async () => {
      reviewReportsService.submitReport.mockRejectedValueOnce(
        new ForbiddenException('본인의 리뷰는 신고할 수 없습니다'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/reviews/1/report')
        .set('Authorization', 'Bearer valid-token')
        .send(validDto)
        .expect(403);
    });

    /**
     * TC-7: 중복 신고 → 서비스에서 ConflictException → 409
     */
    it('이미 신고한 리뷰를 다시 신고하면 409를 반환한다', async () => {
      reviewReportsService.submitReport.mockRejectedValueOnce(
        new ConflictException('이미 신고한 리뷰입니다'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/reviews/1/report')
        .set('Authorization', 'Bearer valid-token')
        .send(validDto)
        .expect(409);
    });

    /**
     * TC-8: 존재하지 않는 리뷰 신고 → 서비스에서 NotFoundException → 404
     */
    it('존재하지 않는 리뷰를 신고하면 404를 반환한다', async () => {
      reviewReportsService.submitReport.mockRejectedValueOnce(
        new NotFoundException('리뷰를 찾을 수 없습니다'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/reviews/999/report')
        .set('Authorization', 'Bearer valid-token')
        .send(validDto)
        .expect(404);
    });

    /**
     * TC-9: reviewId가 숫자가 아닌 경우 → 400
     */
    it('reviewId가 숫자가 아닌 경우 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews/not-a-number/report')
        .set('Authorization', 'Bearer valid-token')
        .send(validDto)
        .expect(400);
    });
  });

  // ─── GET /api/v1/admin/review-reports ────────────────────────────────────

  describe('GET /api/v1/admin/review-reports', () => {
    /**
     * TC-1: admin 토큰으로 신고 목록 조회 → 200
     */
    it('관리자 인증으로 신고 목록을 조회하면 200과 페이지네이션 결과를 반환한다', async () => {
      // Arrange
      reviewReportsService.findReports.mockResolvedValue(mockReportListResult);

      // Act & Assert
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/review-reports')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
      expect(reviewReportsService.findReports).toHaveBeenCalled();
    });

    /**
     * TC-2: Authorization 헤더 없음 → 401
     */
    it('인증 토큰 없이 신고 목록을 요청하면 401을 반환한다', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/review-reports')
        .expect(401);

      expect(reviewReportsService.findReports).not.toHaveBeenCalled();
    });

    /**
     * TC-3: USER 역할 토큰으로 요청 → 403
     */
    it('관리자가 아닌 사용자가 신고 목록을 요청하면 403을 반환한다', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/review-reports')
        .set('Authorization', 'Bearer valid-token') // role=USER
        .expect(403);

      expect(reviewReportsService.findReports).not.toHaveBeenCalled();
    });
  });

  // ─── GET /api/v1/admin/review-reports/:id ────────────────────────────────

  describe('GET /api/v1/admin/review-reports/:id', () => {
    /**
     * TC-4: admin 토큰으로 신고 상세 조회 → 200
     */
    it('관리자 인증으로 신고 상세를 조회하면 200과 리뷰·신고자 정보를 반환한다', async () => {
      // Arrange
      reviewReportsService.findReportById.mockResolvedValue(mockReportDetailResult);

      // Act & Assert
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/review-reports/100')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(reviewReportsService.findReportById).toHaveBeenCalledWith(100);
    });
  });

  // ─── PATCH /api/v1/admin/review-reports/:id/resolve ──────────────────────

  describe('PATCH /api/v1/admin/review-reports/:id/resolve', () => {
    /**
     * TC-5: 유효한 action으로 신고 처리 → 200
     */
    it('유효한 action으로 신고를 처리하면 200과 처리 결과를 반환한다', async () => {
      // Arrange
      reviewReportsService.resolveReport.mockResolvedValue(mockResolveResult);

      // Act & Assert
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/review-reports/100/resolve')
        .set('Authorization', 'Bearer admin-token')
        .send({ action: ReportResolution.RESTORED, note: '정상 리뷰 확인' })
        .expect(200);

      expect(res.body).toHaveProperty('resolution');
      expect(reviewReportsService.resolveReport).toHaveBeenCalledWith(
        100,
        adminUser.id,
        expect.objectContaining({ action: ReportResolution.RESTORED }),
      );
    });

    /**
     * TC-6: 유효하지 않은 action 값 → DTO 검증 실패 → 400
     */
    it('action이 유효하지 않은 enum 값이면 400 DTO 검증 오류를 반환한다', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/review-reports/100/resolve')
        .set('Authorization', 'Bearer admin-token')
        .send({ action: 'INVALID_ACTION' })
        .expect(400);

      expect(reviewReportsService.resolveReport).not.toHaveBeenCalled();
    });
  });
});
