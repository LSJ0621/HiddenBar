import path from 'path';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import {
  createTestApp,
  createTestAppWithGoogleMock,
  signupUser,
  loginUser,
  extractAccessToken,
} from './e2e-test-helper';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';
import { TEST_USER_1 } from './test-constants';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('Profile (e2e)', () => {
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

  // ─── Get profile ─────────────────────────────────

  describe('Get profile (GET /api/v1/users/me)', () => {
    it('should return email user profile with hasPassword true', async () => {
      const user = await signupUser(app, TEST_USER_1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe(TEST_USER_1.email);
      expect(res.body.name).toBe(TEST_USER_1.name);
      expect(res.body.role).toBe('USER');
      expect(res.body).toHaveProperty('profileImage');
      expect(res.body.hasPassword).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });
  });

  // ─── Update profile ─────────────────────────────────

  describe('Update profile (PATCH /api/v1/users/me)', () => {
    it('should update name successfully', async () => {
      const user = await signupUser(app, TEST_USER_1);

      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({ name: 'UpdatedName' })
        .expect(200);

      expect(res.body.name).toBe('UpdatedName');
    });

    it('should return 400 for name under 2 chars', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({ name: 'A' })
        .expect(400);
    });

    it('should return 400 for name over 30 chars', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({ name: 'A'.repeat(31) })
        .expect(400);
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  // ─── Change password ─────────────────────────────────

  describe('Change password (PATCH /api/v1/users/me/password)', () => {
    it('should change password with valid credentials', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({
          currentPassword: TEST_USER_1.password,
          newPassword: 'NewPassword456!',
        })
        .expect(204);
    });

    it('should return 401 for incorrect current password', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        })
        .expect(401);
    });

    it('should return 400 for new password under 8 chars', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({
          currentPassword: TEST_USER_1.password,
          newPassword: 'Short1',
        })
        .expect(400);
    });

    it('should return 400 for new password without digits', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({
          currentPassword: TEST_USER_1.password,
          newPassword: 'NoDigitsHere!',
        })
        .expect(400);
    });

    it('should return 400 when new password equals current', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({
          currentPassword: TEST_USER_1.password,
          newPassword: TEST_USER_1.password,
        })
        .expect(400);
    });

    it('should allow login with new password after change', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({
          currentPassword: TEST_USER_1.password,
          newPassword: 'NewPassword456!',
        })
        .expect(204);

      const loginRes = await loginUser(app, {
        email: TEST_USER_1.email,
        password: 'NewPassword456!',
      });
      expect(loginRes.accessToken).toBeDefined();
    });

    it('should reject login with old password after change', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .send({
          currentPassword: TEST_USER_1.password,
          newPassword: 'NewPassword456!',
        })
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: TEST_USER_1.email,
          password: TEST_USER_1.password,
        })
        .expect(401);
    });
  });

  // ─── Profile image upload ─────────────────────────────

  describe('Profile image upload (POST /api/v1/users/me/profile-image)', () => {
    it('should upload JPEG image', async () => {
      const user = await signupUser(app, TEST_USER_1);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('file', path.join(FIXTURES_DIR, 'test-image.jpg'))
        .expect(200);

      expect(res.body.profileImage).toBeDefined();
      expect(res.body.profileImage).not.toBeNull();
    });

    it('should upload PNG image', async () => {
      const user = await signupUser(app, TEST_USER_1);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('file', path.join(FIXTURES_DIR, 'test-image.png'))
        .expect(200);

      expect(res.body.profileImage).toBeDefined();
      expect(res.body.profileImage).not.toBeNull();
    });

    it('should return 400 for invalid file type', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('file', path.join(FIXTURES_DIR, 'test-file.txt'))
        .expect(400);
    });

    it('should return 413 for file exceeding 5MB', async () => {
      const user = await signupUser(app, TEST_USER_1);

      // 5MB + 1byte 버퍼 생성 (JPEG magic bytes로 시작)
      const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
      // JPEG magic bytes
      oversized[0] = 0xff;
      oversized[1] = 0xd8;
      oversized[2] = 0xff;

      await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('file', oversized, 'oversized.jpg')
        .expect(413);
    });

    it('should return 400 when no file attached', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(400);
    });

    it('should replace image on re-upload with new URL', async () => {
      const user = await signupUser(app, TEST_USER_1);

      const res1 = await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('file', path.join(FIXTURES_DIR, 'test-image.jpg'))
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .attach('file', path.join(FIXTURES_DIR, 'test-image.png'))
        .expect(200);

      expect(res1.body.profileImage).toBeDefined();
      expect(res2.body.profileImage).toBeDefined();
      // 새 URL이 반환됨 (MockS3Client는 UUID 기반 key 생성)
      expect(res2.body.profileImage).not.toBe(res1.body.profileImage);
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .attach('file', path.join(FIXTURES_DIR, 'test-image.jpg'))
        .expect(401);
    });
  });
  // ─── Google user tests ─────────────────────────────────

  describe('Profile - Google user', () => {
    /** Google OAuth로 유저를 생성하고 accessToken을 반환한다. */
    async function createGoogleUser(): Promise<string> {
      const res = await request(googleApp.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code' })
        .expect(201);

      return extractAccessToken(res);
    }

    describe('Get profile', () => {
      it('should return Google user profile with hasPassword false', async () => {
        const token = await createGoogleUser();

        const res = await request(googleApp.getHttpServer())
          .get('/api/v1/users/me')
          .set('Cookie', `accessToken=${token}`)
          .expect(200);

        expect(res.body.email).toBe('google-user@test.com');
        expect(res.body.hasPassword).toBe(false);
      });
    });

    describe('Change password', () => {
      it('should return 403 for social-only account', async () => {
        const token = await createGoogleUser();

        await request(googleApp.getHttpServer())
          .patch('/api/v1/users/me/password')
          .set('Cookie', `accessToken=${token}`)
          .send({
            currentPassword: 'AnyPassword123!',
            newPassword: 'NewPassword456!',
          })
          .expect(403);
      });
    });
  });
});
