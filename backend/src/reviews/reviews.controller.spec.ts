import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewPhotosService } from './review-photos.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Role, ReviewStatus } from '@my-project/shared';

describe('ReviewsController', () => {
  let app: INestApplication;
  let reviewsService: {
    create: jest.Mock;
    findByBarId: jest.Mock;
    findMyReview: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    uploadPhotos: jest.Mock;
    removePhoto: jest.Mock;
  };

  const mockReview = {
    id: 1,
    rating: 4,
    content: 'Great cocktails',
    visitedAt: '2026-03-15',
    status: ReviewStatus.PUBLISHED,
    author: { id: 1, name: 'Test User', profileImageUrl: null },
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const currentUser = { id: 1, email: 'test@example.com', role: Role.USER };

  beforeAll(async () => {
    reviewsService = {
      create: jest.fn().mockResolvedValue(mockReview),
      findByBarId: jest.fn().mockResolvedValue({
        items: [mockReview],
        meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        stats: { averageRating: 4, totalCount: 1, distribution: {} },
      }),
      findMyReview: jest.fn().mockResolvedValue(mockReview),
      update: jest.fn().mockResolvedValue(mockReview),
      remove: jest.fn().mockResolvedValue(undefined),
      uploadPhotos: jest.fn().mockResolvedValue([
        { id: 1, url: 'https://example.com/photo.jpg', sortOrder: 0 },
      ]),
      removePhoto: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        { provide: ReviewsService, useValue: reviewsService },
        {
          provide: ReviewPhotosService,
          useValue: {
            uploadPhotos: reviewsService.uploadPhotos,
            removePhoto: reviewsService.removePhoto,
          },
        },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: any) => {
              const req = context.switchToHttp().getRequest();
              if (req.headers.authorization) {
                req.user = currentUser;
                return true;
              }
              throw new UnauthorizedException();
            },
          },
        },
      ],
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

  // ─── POST /api/v1/reviews ─────────────────────────────

  describe('POST /api/v1/reviews', () => {
    const validDto = {
      barId: 1,
      rating: 4,
      content: 'Great cocktails',
      visitedAt: '2026-03-15',
    };

    it('should return 201 with created review', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', 'Bearer valid-token')
        .send(validDto)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.rating).toBe(4);
      expect(reviewsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ barId: 1, rating: 4 }),
        expect.objectContaining({ id: 1 }),
      );
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .send(validDto)
        .expect(401);
    });
  });

  // ─── GET /api/v1/bars/:barId/reviews ──────────────────

  describe('GET /api/v1/bars/:barId/reviews', () => {
    it('should return paginated reviews for a bar', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/1/reviews')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('stats');
      expect(reviewsService.findByBarId).toHaveBeenCalledWith(
        1,
        expect.any(Object),
        expect.objectContaining({ id: 1 }),
      );
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bars/1/reviews')
        .expect(401);
    });
  });

  // ─── GET /api/v1/bars/:barId/my-review ────────────────

  describe('GET /api/v1/bars/:barId/my-review', () => {
    it('should return current user review for a bar', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/1/my-review')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(reviewsService.findMyReview).toHaveBeenCalledWith(1, 1);
    });

    it('should return 404 when user has no review', async () => {
      reviewsService.findMyReview.mockRejectedValueOnce(
        new NotFoundException('리뷰를 찾을 수 없습니다'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/bars/99/my-review')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  // ─── PATCH /api/v1/reviews/:reviewId ──────────────────

  describe('PATCH /api/v1/reviews/:reviewId', () => {
    it('should return 200 with updated review', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/reviews/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Updated content', rating: 5 })
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(reviewsService.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ content: 'Updated content' }),
        expect.objectContaining({ id: 1 }),
      );
    });

    it('should return 403 when user is not the author', async () => {
      reviewsService.update.mockRejectedValueOnce(
        new ForbiddenException('본인의 리뷰만 수정할 수 있습니다'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/reviews/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ content: 'Hacked' })
        .expect(403);
    });
  });

  // ─── DELETE /api/v1/reviews/:reviewId ─────────────────

  describe('DELETE /api/v1/reviews/:reviewId', () => {
    it('should return 204 on successful deletion', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/reviews/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);

      expect(reviewsService.remove).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ id: 1 }),
      );
    });

    it('should return 404 for non-existent review', async () => {
      reviewsService.remove.mockRejectedValueOnce(
        new NotFoundException('리뷰를 찾을 수 없습니다'),
      );

      await request(app.getHttpServer())
        .delete('/api/v1/reviews/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });

    it('should return 403 when user is not the author', async () => {
      reviewsService.remove.mockRejectedValueOnce(
        new ForbiddenException('본인의 리뷰만 삭제할 수 있습니다'),
      );

      await request(app.getHttpServer())
        .delete('/api/v1/reviews/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
    });
  });

  // ─── DELETE /api/v1/reviews/:reviewId/photos/:photoId ─

  describe('DELETE /api/v1/reviews/:reviewId/photos/:photoId', () => {
    it('should return 204 on successful photo deletion', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/reviews/1/photos/10')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);

      expect(reviewsService.removePhoto).toHaveBeenCalledWith(1, 10, expect.objectContaining({ id: 1 }));
    });

    it('should return 404 for non-existent photo', async () => {
      reviewsService.removePhoto.mockRejectedValueOnce(
        new NotFoundException('사진을 찾을 수 없습니다'),
      );

      await request(app.getHttpServer())
        .delete('/api/v1/reviews/1/photos/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });
});
