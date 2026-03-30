import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { BookmarksController } from './bookmarks.controller.js';
import { BookmarksService } from './bookmarks.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Role } from '@my-project/shared';

describe('BookmarksController', () => {
  let app: INestApplication;
  let bookmarksService: {
    add: jest.Mock;
    remove: jest.Mock;
    findUserBookmarks: jest.Mock;
  };

  beforeAll(async () => {
    bookmarksService = {
      add: jest.fn().mockResolvedValue({ isBookmarked: true, bookmarkCount: 1 }),
      remove: jest.fn().mockResolvedValue({ isBookmarked: false, bookmarkCount: 0 }),
      findUserBookmarks: jest.fn().mockResolvedValue({
        items: [
          {
            id: 1,
            name: 'The Secret Bar',
            city: 'Bangkok',
            country: 'Thailand',
            thumbnail: 'https://s3.../photo.jpg',
            bookmarkCount: 42,
            bookmarkedAt: new Date().toISOString(),
          },
        ],
        meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarksController],
      providers: [
        { provide: BookmarksService, useValue: bookmarksService },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: any) => {
              const req = context.switchToHttp().getRequest();
              if (req.headers.authorization) {
                req.user = { id: 1, email: 'test@example.com', role: Role.USER };
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

  // ─── PUT /api/v1/bars/:id/bookmark ────────────────────

  describe('PUT /api/v1/bars/:id/bookmark', () => {
    it('should return 200 with isBookmarked true and bookmarkCount', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/bars/1/bookmark')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.isBookmarked).toBe(true);
      expect(res.body.bookmarkCount).toBe(1);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/bars/1/bookmark')
        .expect(401);
    });

    it('should return 404 for non-APPROVED bar', async () => {
      bookmarksService.add.mockRejectedValueOnce(
        new NotFoundException('Only approved bars can be bookmarked.'),
      );

      await request(app.getHttpServer())
        .put('/api/v1/bars/999/bookmark')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  // ─── DELETE /api/v1/bars/:id/bookmark ────────────────────

  describe('DELETE /api/v1/bars/:id/bookmark', () => {
    it('should return 200 with isBookmarked false and bookmarkCount', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/bars/1/bookmark')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.isBookmarked).toBe(false);
      expect(res.body.bookmarkCount).toBe(0);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/bars/1/bookmark')
        .expect(401);
    });
  });

  // ─── GET /api/v1/users/me/bookmarks ────────────────────

  describe('GET /api/v1/users/me/bookmarks', () => {
    it('should return 200 with paginated list of bookmarked bars', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/bookmarks')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me/bookmarks')
        .expect(401);
    });
  });
});
