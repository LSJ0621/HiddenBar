import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CookieService } from './cookie.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { AuthPasswordService } from './auth-password.service.js';
import { ConfigService } from '@nestjs/config';
import { Role } from '@my-project/shared';

describe('AuthController', () => {
  let app: INestApplication;
  let authService: {
    signup: jest.Mock;
    login: jest.Mock;
    googleLogin: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };

  const mockAuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      profileImage: null,
      role: Role.USER,
    },
  };

  beforeAll(async () => {
    authService = {
      signup: jest.fn().mockResolvedValue(mockAuthResponse),
      login: jest.fn().mockResolvedValue(mockAuthResponse),
      googleLogin: jest
        .fn()
        .mockResolvedValue({ ...mockAuthResponse, isNewUser: false }),
      refresh: jest.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      }),
      logout: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: EmailVerificationService,
          useValue: {
            sendCode: jest.fn().mockResolvedValue(undefined),
            verifyCode: jest
              .fn()
              .mockResolvedValue({ verificationToken: 'vt' }),
          },
        },
        {
          provide: AuthPasswordService,
          useValue: {
            resetPassword: jest.fn().mockResolvedValue(undefined),
          },
        },
        CookieService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                'cookie.secure': false,
                'cookie.sameSite': 'lax',
              };
              return config[key] ?? defaultValue;
            },
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.use(cookieParser());
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

  // ─── POST /api/v1/auth/signup ───────────────────────

  describe('POST /api/v1/auth/signup', () => {
    it('should return 201 with user and set cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Password1',
          name: 'Test',
          verificationToken: 'valid-token',
        })
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ email: 'not-email', password: 'Password1', name: 'Test', verificationToken: 'vt' })
        .expect(400);
    });

    it('should return 400 for password without alphanumeric combination', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'onlyletters',
          name: 'Test',
          verificationToken: 'vt',
        })
        .expect(400);
    });

    it('should return 400 for password shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ email: 'test@example.com', password: 'pass1', name: 'Test', verificationToken: 'vt' })
        .expect(400);
    });

    it('should return 400 for name shorter than 2 characters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ email: 'test@example.com', password: 'Password1', name: 'T', verificationToken: 'vt' })
        .expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      authService.signup.mockRejectedValueOnce(
        new ConflictException('This email is already registered.'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Password1',
          name: 'Test',
          verificationToken: 'vt',
        })
        .expect(409);
    });
  });

  // ─── POST /api/v1/auth/login ────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 with user and set cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' })
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for wrong email or password', async () => {
      authService.login.mockRejectedValueOnce(new UnauthorizedException());

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrong' })
        .expect(401);
    });

    it('should return 403 for inactive account', async () => {
      authService.login.mockRejectedValueOnce(new ForbiddenException());

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password1' })
        .expect(403);
    });
  });

  // ─── POST /api/v1/auth/google ───────────────────────

  describe('POST /api/v1/auth/google', () => {
    it('should return 200 for existing Google user and set cookies', async () => {
      authService.googleLogin.mockResolvedValueOnce({
        ...mockAuthResponse,
        isNewUser: false,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code' })
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body).not.toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 201 for new Google user', async () => {
      authService.googleLogin.mockResolvedValueOnce({
        ...mockAuthResponse,
        isNewUser: true,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'valid-code' })
        .expect(201);
    });

    it('should return 401 for invalid authorization code', async () => {
      authService.googleLogin.mockRejectedValueOnce(
        new UnauthorizedException(),
      );

      await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'invalid-code' })
        .expect(401);
    });

    it('should return 403 for inactive account', async () => {
      authService.googleLogin.mockRejectedValueOnce(new ForbiddenException());

      await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ code: 'some-code' })
        .expect(403);
    });
  });

  // ─── POST /api/v1/auth/refresh ──────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 200 with success and set new cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=valid-rt'])
        .expect(200);

      expect(res.body).toEqual({ success: true });
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 when no refresh token cookie', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);
    });

    it('should return 401 for expired or invalid refresh token', async () => {
      authService.refresh.mockRejectedValueOnce(new UnauthorizedException());

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=expired-rt'])
        .expect(401);
    });
  });

  // ─── POST /api/v1/auth/logout ───────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('should return 204 and clear cookies', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', ['refreshToken=some-rt'])
        .expect(204);

      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 204 even without refresh token cookie', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(204);
    });
  });
});
