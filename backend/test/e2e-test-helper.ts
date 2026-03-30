import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { GoogleOAuthClient } from '../src/auth/clients/google-oauth.client';
import { S3Client } from '../src/external/aws/clients/s3.client';
import { MockS3Client } from '../src/external/mocks/mock-s3.client';
import { UserThrottlerGuard } from '../src/common/guards/user-throttler.guard';
import { EmailVerificationPurpose } from '../src/auth/constants/email-verification.constants';
import { MapsService } from '../src/maps/maps.service';
import { GooglePlacesClient } from '../src/external/google/clients/google-places.client';
import { TravelMode } from '@my-project/shared';
import { testDataSource } from './test-data-source';

/** createTestApp 계열 함수 공통 옵션 */
export interface TestAppOptions {
  /** true면 ThrottlerGuard/UserThrottlerGuard를 no-op으로 override한다. 기본값 true */
  disableThrottling?: boolean;
}

const NO_OP_GUARD = { canActivate: () => true };

/**
 * TestingModuleBuilder에 throttler guard override를 적용한다.
 */
function applyThrottlerOverride(
  builder: ReturnType<typeof Test.createTestingModule>,
  options: TestAppOptions,
) {
  if (options.disableThrottling !== false) {
    return builder
      .overrideGuard(ThrottlerGuard)
      .useValue(NO_OP_GUARD)
      .overrideGuard(UserThrottlerGuard)
      .useValue(NO_OP_GUARD);
  }
  return builder;
}

/**
 * NestJS 앱 내부 TypeOrmModule이 스키마를 drop하지 않도록 환경변수를 비활성화한다.
 * 스키마 관리는 testDataSource(dropSchema: true 하드코딩)에서만 담당한다.
 */
process.env.POSTGRES_DROP_SCHEMA = 'false';

/**
 * E2E 테스트용 NestJS 앱 인스턴스를 생성한다.
 */
export async function createTestApp(
  options: TestAppOptions = {},
): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(DataSource)
    .useValue(testDataSource)
    .overrideProvider(S3Client)
    .useClass(MockS3Client);

  builder = applyThrottlerOverride(builder, options) as typeof builder;

  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}

/**
 * set-cookie 헤더에서 accessToken 값을 파싱한다.
 */
export function extractAccessToken(res: request.Response): string {
  const cookies = res.headers['set-cookie'];
  if (!cookies) {
    throw new Error('No set-cookie header found in response');
  }
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
  for (const cookie of cookieArray) {
    const match = cookie.match(/accessToken=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  throw new Error('accessToken not found in set-cookie header');
}

/**
 * set-cookie 헤더에서 refreshToken 값을 파싱한다.
 */
export function extractRefreshToken(res: request.Response): string {
  const cookies = res.headers['set-cookie'];
  if (!cookies) {
    throw new Error('No set-cookie header found in response');
  }
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
  for (const cookie of cookieArray) {
    const match = cookie.match(/refreshToken=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  throw new Error('refreshToken not found in set-cookie header');
}

/**
 * 테스트용 이메일 인증 토큰을 생성한다.
 */
export function generateTestVerificationToken(
  email: string,
  app: INestApplication<App>,
): string {
  const jwtService = app.get(JwtService);
  return jwtService.sign(
    {
      email,
      purpose: EmailVerificationPurpose.SIGNUP,
      type: 'email-verification',
    },
    { expiresIn: '10m' },
  );
}

/**
 * 회원가입 헬퍼. accessToken, refreshToken, user 정보를 반환한다.
 */
export async function signupUser(
  app: INestApplication<App>,
  data: { email: string; password: string; name: string },
) {
  const verificationToken = generateTestVerificationToken(data.email, app);

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/signup')
    .send({ ...data, verificationToken })
    .expect(201);

  const accessToken = extractAccessToken(res);
  const refreshToken = extractRefreshToken(res);

  return {
    accessToken,
    refreshToken,
    user: res.body.user as { id: number; email: string; name: string; role: string },
  };
}

/**
 * 로그인 헬퍼. accessToken, refreshToken, user 정보를 반환한다.
 */
export async function loginUser(
  app: INestApplication<App>,
  data: { email: string; password: string },
) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send(data)
    .expect(200);

  const accessToken = extractAccessToken(res);
  const refreshToken = extractRefreshToken(res);

  return {
    accessToken,
    refreshToken,
    user: res.body.user as { id: number; email: string; name: string; role: string },
  };
}

/**
 * 관리자 유저를 생성한다. 가입 후 DB에서 직접 role을 ADMIN으로 변경한다.
 */
export async function createAdminUser(
  app: INestApplication<App>,
  data: { email: string; password: string; name: string },
) {
  const result = await signupUser(app, data);

  await testDataSource.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [
    result.user.id,
  ]);

  // Re-login to get token with ADMIN role in JWT payload
  return loginUser(app, { email: data.email, password: data.password });
}

/**
 * 바를 생성한다. POST /api/v1/bars → 201.
 */
export async function createBar(
  app: INestApplication<App>,
  token: string,
  dto: Record<string, unknown>,
) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/bars')
    .set('Cookie', `accessToken=${token}`)
    .send(dto)
    .expect(201);

  return res.body;
}

/**
 * 바를 생성하고 관리자 승인까지 완료한다. APPROVED 상태의 바를 반환한다.
 */
export async function createApprovedBar(
  app: INestApplication<App>,
  token: string,
  adminToken: string,
  dto: Record<string, unknown>,
) {
  const bar = await createBar(app, token, dto);

  await request(app.getHttpServer())
    .patch(`/api/v1/admin/bars/${bar.id}/approve`)
    .set('Cookie', `accessToken=${adminToken}`)
    .expect(200);

  return { ...bar, status: 'APPROVED' };
}

/**
 * 바에 사진을 업로드한다. POST /api/v1/bars/:id/photos multipart 업로드.
 */
export async function uploadPhoto(
  app: INestApplication<App>,
  token: string,
  barId: number,
  filePath: string,
) {
  const res = await request(app.getHttpServer())
    .post(`/api/v1/bars/${barId}/photos`)
    .set('Cookie', `accessToken=${token}`)
    .attach('files', filePath)
    .expect(201);

  return res.body;
}

/**
 * 북마크를 추가한다. PUT /api/v1/bars/:barId/bookmark.
 */
export async function addBookmark(
  app: INestApplication<App>,
  token: string,
  barId: number,
) {
  const res = await request(app.getHttpServer())
    .put(`/api/v1/bars/${barId}/bookmark`)
    .set('Cookie', `accessToken=${token}`)
    .expect(200);

  return res.body;
}

/**
 * 북마크를 제거한다. DELETE /api/v1/bars/:barId/bookmark.
 */
export async function removeBookmark(
  app: INestApplication<App>,
  token: string,
  barId: number,
) {
  const res = await request(app.getHttpServer())
    .delete(`/api/v1/bars/${barId}/bookmark`)
    .set('Cookie', `accessToken=${token}`)
    .expect(200);

  return res.body;
}

/**
 * 바를 생성하고 관리자 거절까지 완료한다. REJECTED 상태의 바를 반환한다.
 */
export async function createRejectedBar(
  app: INestApplication<App>,
  ownerToken: string,
  adminToken: string,
  dto: Record<string, unknown>,
) {
  const bar = await createBar(app, ownerToken, dto);

  await request(app.getHttpServer())
    .patch(`/api/v1/admin/bars/${bar.id}/reject`)
    .set('Cookie', `accessToken=${adminToken}`)
    .send({ reason: 'Rejected for testing purposes' })
    .expect(200);

  return { ...bar, status: 'REJECTED' };
}

/**
 * 리뷰를 생성한다. POST /api/v1/reviews → 201.
 */
export async function createReview(
  app: INestApplication<App>,
  token: string,
  barId: number,
  content = 'Test review content',
  rating = 4,
) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/reviews')
    .set('Cookie', `accessToken=${token}`)
    .send({ barId, rating, content })
    .expect(201);
  return res.body;
}

/**
 * Google Maps API가 mock된 테스트 앱을 생성한다.
 * - MapsService: getDirections()를 mock. 입력에 따라 고정 응답 반환.
 * - GooglePlacesClient: autocomplete(), getDetails(), createSessionToken()을 mock.
 * - disableThrottling: false로 호출하면 속도 제한 테스트에 사용할 수 있다.
 */
export async function createTestAppWithMapsMock(
  options: TestAppOptions = {},
): Promise<INestApplication<App>> {
  const mockMapsService = {
    getDirections: jest.fn().mockImplementation((dto: { originLat: number; originLng: number; destLat: number; destLng: number; mode?: TravelMode }) => {
      const mode = dto.mode ?? TravelMode.WALKING;

      // 경로를 찾을 수 없는 좌표 쌍 (sentinel)
      if (dto.destLat === 0 && dto.destLng === 0) {
        throw new NotFoundException('No route found.');
      }

      if (mode === TravelMode.TRANSIT) {
        return {
          routes: [
            {
              summary: '',
              distance: { text: '5.2 km', value: 5200 },
              duration: { text: '25 mins', value: 1500 },
              steps: [
                {
                  instruction: 'Walk to station',
                  distance: { text: '300 m', value: 300 },
                  duration: { text: '4 mins', value: 240 },
                  startLocation: { lat: dto.originLat, lng: dto.originLng },
                  endLocation: { lat: 37.5000, lng: 127.0300 },
                  travelMode: 'WALK',
                },
                {
                  instruction: 'Take subway',
                  distance: { text: '4.5 km', value: 4500 },
                  duration: { text: '18 mins', value: 1080 },
                  startLocation: { lat: 37.5000, lng: 127.0300 },
                  endLocation: { lat: 37.5100, lng: 127.0500 },
                  travelMode: 'TRANSIT',
                  transitDetails: {
                    departureStop: 'Gangnam Station',
                    arrivalStop: 'Samseong Station',
                    departureTime: '2026-01-01T10:00:00Z',
                    arrivalTime: '2026-01-01T10:18:00Z',
                    lineName: 'Line 2',
                    lineShortName: '2',
                    lineColor: '#33A23D',
                    lineTextColor: '#FFFFFF',
                    vehicleType: 'SUBWAY',
                    stopCount: 3,
                  },
                  polylines: ['encodedPolylineTransit1'],
                },
                {
                  instruction: 'Walk to destination',
                  distance: { text: '400 m', value: 400 },
                  duration: { text: '5 mins', value: 300 },
                  startLocation: { lat: 37.5100, lng: 127.0500 },
                  endLocation: { lat: dto.destLat, lng: dto.destLng },
                  travelMode: 'WALK',
                },
              ],
              overviewPolyline: 'transitOverviewPolyline',
              startAddress: '',
              endAddress: '',
            },
            {
              summary: '',
              distance: { text: '6.0 km', value: 6000 },
              duration: { text: '30 mins', value: 1800 },
              steps: [
                {
                  instruction: 'Take bus',
                  distance: { text: '6.0 km', value: 6000 },
                  duration: { text: '30 mins', value: 1800 },
                  startLocation: { lat: dto.originLat, lng: dto.originLng },
                  endLocation: { lat: dto.destLat, lng: dto.destLng },
                  travelMode: 'TRANSIT',
                  transitDetails: {
                    departureStop: 'Gangnam Bus Stop',
                    arrivalStop: 'Samseong Bus Stop',
                    departureTime: '2026-01-01T10:05:00Z',
                    arrivalTime: '2026-01-01T10:35:00Z',
                    lineName: 'Bus 401',
                    lineShortName: '401',
                    lineColor: '#4285F4',
                    lineTextColor: '#FFFFFF',
                    vehicleType: 'BUS',
                    stopCount: 8,
                  },
                  polylines: ['encodedPolylineBus'],
                },
              ],
              overviewPolyline: 'transitAltPolyline',
              startAddress: '',
              endAddress: '',
            },
          ],
        };
      }

      // WALKING / DRIVING → 단일 경로
      return {
        routes: [
          {
            summary: '',
            distance: { text: '2.5 km', value: 2500 },
            duration: { text: '30 mins', value: 1800 },
            steps: [
              {
                instruction: 'Head north',
                distance: { text: '1.5 km', value: 1500 },
                duration: { text: '18 mins', value: 1080 },
                startLocation: { lat: dto.originLat, lng: dto.originLng },
                endLocation: { lat: 37.5100, lng: 127.0400 },
                travelMode: mode,
              },
              {
                instruction: 'Turn right',
                distance: { text: '1.0 km', value: 1000 },
                duration: { text: '12 mins', value: 720 },
                startLocation: { lat: 37.5100, lng: 127.0400 },
                endLocation: { lat: dto.destLat, lng: dto.destLng },
                travelMode: mode,
              },
            ],
            overviewPolyline: 'mockEncodedPolyline',
            startAddress: '',
            endAddress: '',
          },
        ],
      };
    }),
  };

  const mockGooglePlacesClient = {
    autocomplete: jest.fn().mockImplementation((query: string) => {
      if (!query || query === 'no-results-query') {
        return Promise.resolve([]);
      }
      return Promise.resolve([
        { placePrediction: { placeId: 'mock-place-id-1' } },
        { placePrediction: { placeId: 'mock-place-id-2' } },
      ]);
    }),
    getDetails: jest.fn().mockResolvedValue({
      displayName: { text: 'Mock Place' },
      formattedAddress: '123 Mock St, Seoul, South Korea',
      location: { latitude: 37.5065, longitude: 127.0536 },
      addressComponents: [
        { longText: 'Seoul', types: ['locality'] },
        { longText: 'South Korea', types: ['country'] },
      ],
    }),
    createSessionToken: jest.fn().mockReturnValue('mock-session-token'),
  };

  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(DataSource)
    .useValue(testDataSource)
    .overrideProvider(MapsService)
    .useValue(mockMapsService)
    .overrideProvider(GooglePlacesClient)
    .useValue(mockGooglePlacesClient)
    .overrideProvider(S3Client)
    .useClass(MockS3Client);

  builder = applyThrottlerOverride(builder, options) as typeof builder;

  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}

/**
 * Google OAuth가 mock된 테스트 앱을 생성한다.
 * code === 'valid-code' → 유효한 프로필 반환, 그 외 → UnauthorizedException.
 */
export async function createTestAppWithGoogleMock(
  options: TestAppOptions = {},
): Promise<INestApplication<App>> {
  const mockGoogleOAuthClient = {
    getAccessToken: jest.fn().mockImplementation((code: string) => {
      if (code === 'valid-code') {
        return Promise.resolve('mock-access-token');
      }
      throw new UnauthorizedException('Invalid authorization code.');
    }),
    getUserProfile: jest.fn().mockResolvedValue({
      id: 'google-id-123',
      email: 'google-user@test.com',
      name: 'Google유저',
      picture: 'https://example.com/photo.jpg',
    }),
  };

  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(DataSource)
    .useValue(testDataSource)
    .overrideProvider(GoogleOAuthClient)
    .useValue(mockGoogleOAuthClient)
    .overrideProvider(S3Client)
    .useClass(MockS3Client);

  builder = applyThrottlerOverride(builder, options) as typeof builder;

  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication();

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}
