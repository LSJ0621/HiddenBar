import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { App } from 'supertest/types';
import request from 'supertest';
import {
  createTestApp,
  createTestAppWithGoogleMock,
  signupUser,
  loginUser,
  createAdminUser,
  extractAccessToken,
  extractRefreshToken,
  generateTestVerificationToken,
} from './e2e-test-helper';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';
import { TEST_ADMIN } from './test-constants';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let googleApp: INestApplication<App>;

  beforeAll(async () => {
    await initTestDb();
    app = await createTestApp();
    googleApp = await createTestAppWithGoogleMock();
  });

  afterAll(async () => {
    await app?.close();
    await googleApp?.close();
  });

  beforeEach(async () => {
    await truncateAllTables(testDataSource);
  });

  // ─── Signup → Login → Profile Flow ──────────────────

  describe('Complete auth flow', () => {
    it('signup → login → get profile → update profile → change password → logout', async () => {
      // 1. Signup
      const signupRes = await signupUser(app, {
        email: 'flow@test.com',
        password: 'Password123!',
        name: 'FlowUser',
      });
      expect(signupRes.accessToken).toBeDefined();
      expect(signupRes.user.email).toBe('flow@test.com');

      // 2. Login
      const loginRes = await loginUser(app, {
        email: 'flow@test.com',
        password: 'Password123!',
      });
      expect(loginRes.accessToken).toBeDefined();

      // 3. Get profile
      const profileRes = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', `accessToken=${loginRes.accessToken}`)
        .expect(200);
      expect(profileRes.body.email).toBe('flow@test.com');
      expect(profileRes.body.name).toBe('FlowUser');

      // 4. Update profile
      const updateRes = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', `accessToken=${loginRes.accessToken}`)
        .send({ name: 'UpdatedName' })
        .expect(200);
      expect(updateRes.body.name).toBe('UpdatedName');

      // 5. Change password
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Cookie', `accessToken=${loginRes.accessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword456!',
        })
        .expect(204);

      // 6. Login with new password
      const newLoginRes = await loginUser(app, {
        email: 'flow@test.com',
        password: 'NewPassword456!',
      });
      expect(newLoginRes.accessToken).toBeDefined();

      // 7. Logout
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `refreshToken=${newLoginRes.refreshToken}`)
        .expect(204);
    });
  });

  // ─── Signup Validation ────────────────────────────────

  describe('Signup validation', () => {
    it('should return 400 for invalid email format', async () => {
      const verificationToken = generateTestVerificationToken(
        'invalid-email',
        app,
      );
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Test1234!',
          name: '테스트유저',
          verificationToken,
        })
        .expect(400);
    });

    it('should return 400 for password shorter than 8 chars', async () => {
      const verificationToken = generateTestVerificationToken(
        'short@test.com',
        app,
      );
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'short@test.com',
          password: 'Ab1',
          name: '테스트유저',
          verificationToken,
        })
        .expect(400);
    });

    it('should return 400 for password without numbers', async () => {
      const verificationToken = generateTestVerificationToken(
        'nonum@test.com',
        app,
      );
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'nonum@test.com',
          password: 'abcdefgh',
          name: '테스트유저',
          verificationToken,
        })
        .expect(400);
    });

    it('should return 400 for password without letters', async () => {
      const verificationToken = generateTestVerificationToken(
        'nolet@test.com',
        app,
      );
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'nolet@test.com',
          password: '12345678',
          name: '테스트유저',
          verificationToken,
        })
        .expect(400);
    });

    it('should return 400 for name shorter than 2 chars', async () => {
      const verificationToken = generateTestVerificationToken(
        'sname@test.com',
        app,
      );
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'sname@test.com',
          password: 'Test1234!',
          name: 'A',
          verificationToken,
        })
        .expect(400);
    });

    it('should return 400 for name longer than 30 chars', async () => {
      const verificationToken = generateTestVerificationToken(
        'lname@test.com',
        app,
      );
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'lname@test.com',
          password: 'Test1234!',
          name: 'A'.repeat(31),
          verificationToken,
        })
        .expect(400);
    });

    it('should return 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          password: 'Test1234!',
          name: '테스트유저',
          verificationToken: 'dummy',
        })
        .expect(400);
    });

    it('should return 400 for unknown fields (forbidNonWhitelisted)', async () => {
      const verificationToken = generateTestVerificationToken(
        'extra@test.com',
        app,
      );
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'extra@test.com',
          password: 'Test1234!',
          name: '테스트유저',
          verificationToken,
          unknownField: 'should not be here',
        })
        .expect(400);
    });
  });

  // ─── Login - Suspended Account ────────────────────────

  describe('Login - suspended account', () => {
    it('should return 403 for suspended account login', async () => {
      const user = await signupUser(app, {
        email: 'suspended@test.com',
        password: 'Password123!',
        name: 'SuspendedUser',
      });

      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Test suspension' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'suspended@test.com',
          password: 'Password123!',
        })
        .expect(403);
    });
  });

  // ─── Refresh Token Rotation ─────────────────────────

  describe('Refresh token rotation', () => {
    it('should issue new tokens and invalidate old refresh token', async () => {
      const signup = await signupUser(app, {
        email: 'refresh@test.com',
        password: 'Password123!',
        name: 'RefreshUser',
      });

      // Refresh
      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${signup.refreshToken}`)
        .expect(200);

      const newAccessToken = extractAccessToken(refreshRes);
      const newRefreshToken = extractRefreshToken(refreshRes);
      expect(newAccessToken).toBeDefined();
      expect(newRefreshToken).toBeDefined();

      // 새 refresh token으로 다시 refresh 가능해야 한다
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${newRefreshToken}`)
        .expect(200);
    });

    it('should return 401 for expired refresh token', async () => {
      const signup = await signupUser(app, {
        email: 'expired-rt@test.com',
        password: 'Password123!',
        name: 'ExpiredRtUser',
      });

      await testDataSource.query(
        `UPDATE refresh_tokens SET "expiresAt" = NOW() - INTERVAL '1 day' WHERE token = $1`,
        [signup.refreshToken],
      );

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${signup.refreshToken}`)
        .expect(401);
    });

    it('should return 401 for reused (rotated) refresh token', async () => {
      const signup = await signupUser(app, {
        email: 'reuse-rt@test.com',
        password: 'Password123!',
        name: 'ReuseRtUser',
      });

      const oldRefreshToken = signup.refreshToken;

      // JWT iat는 초 단위이므로, 동일 초 내 재발급 시 같은 토큰 문자열이 생성될 수 있음
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // 첫 번째 갱신: 성공하고 old token은 무효화됨
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${oldRefreshToken}`)
        .expect(200);

      // 두 번째 시도: 이미 사용된 old token → 401 (재사용 공격 방지)
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${oldRefreshToken}`)
        .expect(401);
    });

    it('should return 401 for tampered refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=this-is-not-a-real-token')
        .expect(401);
    });
  });

  // ─── Logout - Token Invalidation ──────────────────────

  describe('Logout - token invalidation', () => {
    it('should return 401 when refreshing after logout', async () => {
      const signup = await signupUser(app, {
        email: 'logout-inv@test.com',
        password: 'Password123!',
        name: 'LogoutInvUser',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `refreshToken=${signup.refreshToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${signup.refreshToken}`)
        .expect(401);
    });
  });

  // ─── Profile Access - Token Errors ────────────────────

  describe('Profile access - token errors', () => {
    it('should return 401 for expired access token', async () => {
      const jwtService = app.get(JwtService);
      const expiredToken = jwtService.sign(
        { sub: 1, email: 'test@test.com', role: 'USER' },
        { expiresIn: '-1s' },
      );

      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', `accessToken=${expiredToken}`)
        .expect(401);
    });

    it('should return 401 for tampered JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set(
          'Cookie',
          'accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInJvbGUiOiJVU0VSIn0.invalid-signature',
        )
        .expect(401);
    });
  });

  // ─── Error Cases ────────────────────────────────────

  describe('Error cases', () => {
    it('should return 409 for duplicate email signup', async () => {
      await signupUser(app, {
        email: 'dup@test.com',
        password: 'Password123!',
        name: 'DupUser',
      });

      const verificationToken = generateTestVerificationToken('dup@test.com', app);

      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'dup@test.com',
          password: 'Password123!',
          name: 'DupUser2',
          verificationToken,
        })
        .expect(409);
    });

    it('should return 401 for wrong password', async () => {
      await signupUser(app, {
        email: 'wrong@test.com',
        password: 'Password123!',
        name: 'WrongPwdUser',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('should return 401 for non-existent email login', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'noone@test.com',
          password: 'Password123!',
        })
        .expect(401);
    });

    it('should return 401 for unauthenticated profile access', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });
  // ─── Google OAuth ───────────────────────────────────

  describe('Auth - Google OAuth', () => {
    it('should create new user with valid Google code → 201', async () => {
      const res = await request(googleApp.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code' })
        .expect(201);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('google-user@test.com');
      expect(res.body.isNewUser).toBe(true);

      const accessToken = extractAccessToken(res);
      expect(accessToken).toBeDefined();
    });

    it('should login existing Google user → 200', async () => {
      // 첫 번째 로그인: 신규 유저 생성
      await request(googleApp.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code' })
        .expect(201);

      // 두 번째 로그인: 기존 유저
      const res = await request(googleApp.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code' })
        .expect(200);

      expect(res.body.user.email).toBe('google-user@test.com');
      expect(res.body.isNewUser).toBe(false);
    });

    it('should return 401 for invalid Google code', async () => {
      await request(googleApp.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'invalid-code' })
        .expect(401);
    });

    it('should merge with existing local account having same email', async () => {
      // 동일 이메일의 로컬 계정을 먼저 생성
      await signupUser(googleApp, {
        email: 'google-user@test.com',
        password: 'Password123!',
        name: 'LocalUser',
      });

      // Google 로그인 → 기존 계정과 병합
      const res = await request(googleApp.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code' })
        .expect(200);

      expect(res.body.user.email).toBe('google-user@test.com');
      expect(res.body.isNewUser).toBe(false);
    });

    it('should return 403 for suspended Google account', async () => {
      // Google 유저 생성
      const googleRes = await request(googleApp.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code' })
        .expect(201);

      const googleUserId = googleRes.body.user.id;

      // 관리자 생성 후 유저 정지
      const admin = await createAdminUser(googleApp, TEST_ADMIN);

      await request(googleApp.getHttpServer())
        .patch(`/api/v1/admin/users/${googleUserId}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Test suspension' })
        .expect(200);

      // 정지된 계정으로 Google 로그인 시도
      await request(googleApp.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code' })
        .expect(403);
    });
  });
});
