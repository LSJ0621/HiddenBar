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
import { BarsController } from './bars.controller.js';
import { BarsService } from './bars.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { BarOwnerGuard } from './guards/bar-owner.guard.js';
import { UserThrottlerGuard } from '../common/guards/user-throttler.guard.js';
import { BarStatus, Role } from '@my-project/shared';

describe('BarsController', () => {
  let app: INestApplication;
  let barsService: {
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    findMyBars: jest.Mock;
    findNearby: jest.Mock;
  };

  const mockBar = {
    id: 1,
    name: 'The Secret Bar',
    description: 'A hidden gem',
    address: '123 Sukhumvit Rd',
    city: 'Bangkok',
    country: 'Thailand',
    latitude: 13.7563,
    longitude: 100.5018,
    phone: null,
    website: null,
    status: BarStatus.PENDING,
    owner: { id: 1, name: 'Test' },
    photos: [],
    menuItems: [],
    operatingHours: [],
    createdAt: new Date().toISOString(),
  };

  beforeAll(async () => {
    barsService = {
      create: jest.fn().mockResolvedValue(mockBar),
      findOne: jest.fn().mockResolvedValue({
        ...mockBar,
        isBookmarked: false,
        bookmarkCount: 0,
      }),
      update: jest.fn().mockResolvedValue(mockBar),
      remove: jest.fn().mockResolvedValue(undefined),
      findMyBars: jest.fn().mockResolvedValue({
        items: [mockBar],
        meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      }),
      findNearby: jest.fn().mockResolvedValue({
        items: [
          {
            id: 1,
            name: 'The Secret Bar',
            address: '123 Sukhumvit Rd',
            city: 'Bangkok',
            latitude: 13.7563,
            longitude: 100.5018,
            thumbnail: null,
            distanceKm: 0.5,
          },
        ],
        center: { lat: 13.75, lng: 100.5 },
        radiusKm: 5,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BarsController],
      providers: [
        { provide: BarsService, useValue: barsService },
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
      .overrideGuard(BarOwnerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserThrottlerGuard)
      .useValue({ canActivate: () => true })
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

  // ─── POST /api/v1/bars ─────────────────────────────────

  describe('POST /api/v1/bars', () => {
    const validBarDto = {
      name: 'The Secret Bar',
      address: '123 Sukhumvit Rd',
      city: 'Bangkok',
      country: 'Thailand',
      latitude: 13.7563,
      longitude: 100.5018,
    };

    it('should return 201 with created bar for valid input', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Authorization', 'Bearer valid-token')
        .send(validBarDto)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('The Secret Bar');
    });

    it('should return 400 for invalid input (missing required fields)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test' })
        .expect(400);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bars')
        .send(validBarDto)
        .expect(401);
    });
  });

  // ─── GET /api/v1/bars/:id ──────────────────────────────

  describe('GET /api/v1/bars/:id', () => {
    it('should return 200 with bar details for APPROVED bar', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body).toHaveProperty('id');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/api/v1/bars/1').expect(401);
    });

    it('should return 404 for non-existent bar', async () => {
      barsService.findOne.mockRejectedValueOnce(
        new NotFoundException('Bar not found.'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/bars/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });

    it('should return 404 for non-APPROVED bar (non-owner)', async () => {
      barsService.findOne.mockRejectedValueOnce(
        new NotFoundException('Bar not found.'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/bars/2')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });

    it('should return 200 for non-APPROVED bar when requester is owner', async () => {
      barsService.findOne.mockResolvedValueOnce({
        ...mockBar,
        status: BarStatus.PENDING,
        isBookmarked: false,
        bookmarkCount: 0,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.status).toBe(BarStatus.PENDING);
    });
  });

  // ─── PATCH /api/v1/bars/:id ────────────────────────────

  describe('PATCH /api/v1/bars/:id', () => {
    it('should return 200 with updated bar for owner', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/bars/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated Bar' })
        .expect(200);

      expect(res.body).toHaveProperty('id');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/bars/1')
        .send({ name: 'Updated Bar' })
        .expect(401);
    });

    it('should return 403 when user is not owner', async () => {
      barsService.update.mockRejectedValueOnce(
        new ForbiddenException('Only the bar owner can edit this bar.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/bars/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' })
        .expect(403);
    });

    it('should return 404 for non-existent bar', async () => {
      barsService.update.mockRejectedValueOnce(
        new NotFoundException('Bar not found.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/bars/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  // ─── DELETE /api/v1/bars/:id ───────────────────────────

  describe('DELETE /api/v1/bars/:id', () => {
    it('should return 204 on successful soft delete', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/bars/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).delete('/api/v1/bars/1').expect(401);
    });

    it('should return 403 when user is not owner', async () => {
      barsService.remove.mockRejectedValueOnce(
        new ForbiddenException('Only the bar owner can delete this bar.'),
      );

      await request(app.getHttpServer())
        .delete('/api/v1/bars/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
    });

    it('should return 404 for non-existent bar', async () => {
      barsService.remove.mockRejectedValueOnce(
        new NotFoundException('Bar not found.'),
      );

      await request(app.getHttpServer())
        .delete('/api/v1/bars/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  // ─── GET /api/v1/bars/nearby ─────────────────────────

  describe('GET /api/v1/bars/nearby', () => {
    it('should return 200 with nearby bars list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/nearby?lat=13.75&lng=100.50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('center');
      expect(res.body).toHaveProperty('radiusKm');
      expect(res.body.items).toHaveLength(1);
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bars/nearby?lat=13.75&lng=100.50')
        .expect(401);
    });

    it('should return 400 for coordinates out of range (lat > 90)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bars/nearby?lat=91&lng=100.50')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);
    });

    it('should return 400 for radius exceeding maximum (radiusKm > 50)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bars/nearby?lat=13.75&lng=100.50&radiusKm=51')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);
    });

    it('should return 200 with empty items when no bars nearby', async () => {
      barsService.findNearby.mockResolvedValueOnce({
        items: [],
        center: { lat: 0, lng: 0 },
        radiusKm: 5,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/nearby?lat=0&lng=0')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.items).toEqual([]);
    });
  });

  // ─── GET /api/v1/bars/my ──────────────────────────────

  describe('GET /api/v1/bars/my', () => {
    it('should return 200 with paginated list of my bars', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/my')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/api/v1/bars/my').expect(401);
    });
  });
});
