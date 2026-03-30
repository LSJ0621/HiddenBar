import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

describe('SearchController', () => {
  let app: INestApplication;
  let searchService: {
    search: jest.Mock;
  };

  const mockAddressResult = {
    items: [
      {
        id: 1,
        name: 'The Secret Bar',
        address: '123 Sukhumvit Rd',
        city: 'Bangkok',
        country: 'Thailand',
        latitude: 13.7563,
        longitude: 100.5018,
        thumbnail: 'https://example.com/photo1.jpg',
        bookmarkCount: 42,
        isBookmarked: false,
        distanceKm: 0.5,
      },
    ],
    hasMore: false,
    mode: 'address' as const,
    center: { lat: 13.75, lng: 100.5 },
    radiusKm: 5,
  };

  beforeAll(async () => {
    searchService = {
      search: jest.fn().mockResolvedValue(mockAddressResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchService, useValue: searchService },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: any) => {
              const req = context.switchToHttp().getRequest();
              req.user = { id: 1 };
              return true;
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
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/bars/search', () => {
    it('should return 200 with address search results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search')
        .query({ lat: 13.75, lng: 100.5 })
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.hasMore).toBe(false);
      expect(res.body.mode).toBe('address');
      expect(searchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: 13.75,
          lng: 100.5,
        }),
        1,
      );
    });

    it('should return 200 with name search results', async () => {
      searchService.search.mockResolvedValueOnce({
        items: [{ ...mockAddressResult.items[0], similarityScore: 0.8 }],
        hasMore: false,
        mode: 'name',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/bars/search')
        .query({ name: 'Secret Bar', userLat: 13.75, userLng: 100.5 })
        .expect(200);

      expect(res.body.mode).toBe('name');
      expect(searchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Secret Bar',
          userLat: 13.75,
          userLng: 100.5,
        }),
        1,
      );
    });

    it('should return 200 with combined search results', async () => {
      searchService.search.mockResolvedValueOnce({
        items: [{ ...mockAddressResult.items[0], similarityScore: 0.9 }],
        hasMore: false,
        mode: 'combined',
        center: { lat: 13.75, lng: 100.5 },
        radiusKm: 5,
      });

      await request(app.getHttpServer())
        .get('/api/v1/bars/search')
        .query({ name: 'Secret', lat: 13.75, lng: 100.5 })
        .expect(200);

      expect(searchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Secret',
          lat: 13.75,
          lng: 100.5,
        }),
        1,
      );
    });

    it('should return 400 for lat without lng', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bars/search')
        .query({ lat: 13.75 })
        .expect(400);
    });

    it('should return 200 with offset and limit', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bars/search')
        .query({ lat: 13.75, lng: 100.5, offset: 5, limit: 10 })
        .expect(200);

      expect(searchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 5,
          limit: 10,
        }),
        1,
      );
    });

    it('should return 200 for general listing (no search params)', async () => {
      searchService.search.mockResolvedValueOnce({
        items: mockAddressResult.items,
        hasMore: false,
        mode: 'address',
      });

      await request(app.getHttpServer())
        .get('/api/v1/bars/search')
        .query({ sortBy: 'bookmarks', limit: 6 })
        .expect(200);

      expect(searchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'bookmarks',
          limit: 6,
        }),
        1,
      );
    });
  });
});
