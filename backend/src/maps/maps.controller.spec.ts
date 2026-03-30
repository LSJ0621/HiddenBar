import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { MapsController } from './maps.controller.js';
import { MapsService } from './maps.service.js';
import { AddressSearchService } from './address-search.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserThrottlerGuard } from '../common/guards/user-throttler.guard.js';
import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';

/** JwtAuthGuard mock — 인증된 사용자 시뮬레이션 */
const mockJwtGuard = {
  canActivate: (context: any) => {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 1 };
    return true;
  },
};

/** JwtAuthGuard mock — 비인증 시뮬레이션 */
const mockJwtGuardReject = {
  canActivate: () => false,
};

describe('MapsController', () => {
  let app: INestApplication;
  let mapsService: { getDirections: jest.Mock };

  const mockDirectionsResult = {
    routes: [
      {
        summary: '',
        distance: { text: '1.2 km', value: 1200 },
        duration: { text: '15 mins', value: 900 },
        steps: [],
        overviewPolyline: 'encoded_polyline_string',
        startAddress: '',
        endAddress: '',
      },
    ],
  };

  beforeAll(async () => {
    mapsService = {
      getDirections: jest.fn().mockResolvedValue(mockDirectionsResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapsController],
      providers: [
        { provide: MapsService, useValue: mapsService },
        { provide: AddressSearchService, useValue: { search: jest.fn() } },
        { provide: APP_GUARD, useValue: mockJwtGuard },
      ],
    })
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

  it('should return 200 with directions for valid query params', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/maps/directions')
      .query({
        originLat: 13.75,
        originLng: 100.5,
        destLat: 13.76,
        destLng: 100.51,
        mode: 'WALKING',
      })
      .expect(200);

    expect(res.body).toHaveProperty('routes');
    expect(res.body.routes).toHaveLength(1);
  });

  it('should return 400 for invalid coordinates', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/maps/directions')
      .query({
        originLat: 999,
        originLng: 100.5,
        destLat: 13.76,
        destLng: 100.51,
      })
      .expect(400);
  });

  it('should return 400 for invalid travel mode', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/maps/directions')
      .query({
        originLat: 13.75,
        originLng: 100.5,
        destLat: 13.76,
        destLng: 100.51,
        mode: 'FLYING',
      })
      .expect(400);
  });

  it('should return 502 when Google API fails', async () => {
    mapsService.getDirections.mockRejectedValueOnce(
      new BadGatewayException('Google Directions API call failed.'),
    );

    await request(app.getHttpServer())
      .get('/api/v1/maps/directions')
      .query({
        originLat: 13.75,
        originLng: 100.5,
        destLat: 13.76,
        destLng: 100.51,
      })
      .expect(502);
  });

  it('should return 503 when Google API quota exceeded', async () => {
    mapsService.getDirections.mockRejectedValueOnce(
      new ServiceUnavailableException('API quota exceeded. Please try again later.'),
    );

    await request(app.getHttpServer())
      .get('/api/v1/maps/directions')
      .query({
        originLat: 13.75,
        originLng: 100.5,
        destLat: 13.76,
        destLng: 100.51,
      })
      .expect(503);
  });

  it('should return 400 when required query params are missing', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/maps/directions')
      .query({ originLat: 13.75 })
      .expect(400);
  });
});

describe('MapsController - Authentication', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapsController],
      providers: [
        { provide: MapsService, useValue: { getDirections: jest.fn() } },
        { provide: AddressSearchService, useValue: { search: jest.fn() } },
        { provide: APP_GUARD, useValue: mockJwtGuardReject },
      ],
    })
      .overrideGuard(UserThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('비인증 시 directions 요청이 거부된다', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/maps/directions')
      .query({
        originLat: 13.75,
        originLng: 100.5,
        destLat: 13.76,
        destLng: 100.51,
      })
      .expect(403);
  });

  it('비인증 시 address/search 요청이 거부된다', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/maps/address/search')
      .query({ query: 'Bangkok' })
      .expect(403);
  });
});

describe('MapsController - Rate Limiting', () => {
  let app: INestApplication;
  let mapsService: { getDirections: jest.Mock };

  const mockDirectionsResult = {
    routes: [
      {
        summary: '',
        distance: { text: '1.2 km', value: 1200 },
        duration: { text: '15 mins', value: 900 },
        steps: [],
        overviewPolyline: 'encoded_polyline_string',
        startAddress: '',
        endAddress: '',
      },
    ],
  };

  const validQuery = {
    originLat: 13.75,
    originLng: 100.5,
    destLat: 13.76,
    destLng: 100.51,
    mode: 'WALKING',
  };

  beforeEach(async () => {
    mapsService = {
      getDirections: jest.fn().mockResolvedValue(mockDirectionsResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
      controllers: [MapsController],
      providers: [
        { provide: MapsService, useValue: mapsService },
        { provide: AddressSearchService, useValue: { search: jest.fn() } },
        { provide: APP_GUARD, useValue: mockJwtGuard },
        UserThrottlerGuard,
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

  afterEach(async () => {
    await app.close();
  });

  it('should allow 10 requests within rate limit', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .get('/api/v1/maps/directions')
        .query(validQuery)
        .expect(200);
    }
  });

  it('should return 429 when rate limit exceeded', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .get('/api/v1/maps/directions')
        .query(validQuery)
        .expect(200);
    }

    await request(app.getHttpServer())
      .get('/api/v1/maps/directions')
      .query(validQuery)
      .expect(429);
  });
});

describe('MapsController (address search)', () => {
  let app: INestApplication;
  let addressSearchService: { search: jest.Mock };

  const mockSearchResults = [
    {
      displayName: 'Bangkok',
      formattedAddress: 'Bangkok, Thailand',
      city: 'Bangkok',
      country: 'Thailand',
      latitude: 13.7563,
      longitude: 100.5018,
    },
  ];

  beforeAll(async () => {
    addressSearchService = {
      search: jest.fn().mockResolvedValue(mockSearchResults),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MapsController],
      providers: [
        { provide: MapsService, useValue: { getDirections: jest.fn() } },
        { provide: AddressSearchService, useValue: addressSearchService },
        { provide: APP_GUARD, useValue: mockJwtGuard },
      ],
    })
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

  describe('GET /api/v1/maps/address/search', () => {
    it('should return 200 with address search results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/maps/address/search')
        .query({ query: 'Bangkok' })
        .expect(200);

      expect(res.body).toHaveProperty('results');
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].displayName).toBe('Bangkok');
      expect(addressSearchService.search).toHaveBeenCalledWith(
        'Bangkok',
        undefined,
      );
    });

    it('should return 400 when query is missing', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/maps/address/search')
        .expect(400);
    });

    it('should return 200 with empty results for unmatched query', async () => {
      addressSearchService.search.mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/maps/address/search')
        .query({ query: 'xyznonexistent' })
        .expect(200);

      expect(res.body).toEqual({ results: [] });
    });

    it('should accept optional language parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/maps/address/search')
        .query({ query: 'Bangkok', language: 'ko' })
        .expect(200);

      expect(addressSearchService.search).toHaveBeenCalledWith('Bangkok', 'ko');
    });
  });
});
