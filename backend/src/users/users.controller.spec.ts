import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import request from 'supertest';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Role } from '@my-project/shared';
import * as fs from 'fs';
import * as path from 'path';

const fixtureBuffer = fs.readFileSync(
  path.join(__dirname, '../../test/fixtures/test-image.jpg'),
);

describe('UsersController', () => {
  let app: INestApplication;
  let usersService: {
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
    changePassword: jest.Mock;
    uploadProfileImage: jest.Mock;
  };

  const mockProfile = {
    id: 1,
    email: 'test@example.com',
    name: 'Test',
    profileImage: null,
    role: Role.USER,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeAll(async () => {
    usersService = {
      getProfile: jest.fn().mockResolvedValue(mockProfile),
      updateProfile: jest
        .fn()
        .mockResolvedValue({ ...mockProfile, name: 'Updated' }),
      changePassword: jest.fn().mockResolvedValue(undefined),
      uploadProfileImage: jest.fn().mockResolvedValue({
        ...mockProfile,
        profileImage: 'https://s3.test/photo.jpg',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
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

  // ─── GET /api/v1/users/me ──────────────────────────

  describe('GET /api/v1/users/me', () => {
    it('should return 200 with user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('name');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  // ─── PATCH /api/v1/users/me ─────────────────────────

  describe('PATCH /api/v1/users/me', () => {
    it('should return 200 with updated profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' })
        .expect(200);

      expect(res.body.name).toBe('Updated');
    });

    it('should return 400 for invalid name length', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'X' })
        .expect(400);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  // ─── POST /api/v1/users/me/profile-image ───────────

  describe('POST /api/v1/users/me/profile-image', () => {
    it('should return 200 with updated user after image upload', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', fixtureBuffer, 'test.jpg')
        .expect(200);

      expect(res.body).toHaveProperty('profileImage');
      expect(usersService.uploadProfileImage).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/me/profile-image')
        .attach('file', fixtureBuffer, 'test.jpg')
        .expect(401);
    });
  });

  // ─── PATCH /api/v1/users/me/password ────────────────

  describe('PATCH /api/v1/users/me/password', () => {
    it('should return 204 on successful password change', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Authorization', 'Bearer valid-token')
        .send({ currentPassword: 'password1', newPassword: 'newpass123' })
        .expect(204);
    });

    it('should return 400 when new password equals current', async () => {
      usersService.changePassword.mockRejectedValueOnce(
        new BadRequestException(),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Authorization', 'Bearer valid-token')
        .send({ currentPassword: 'password1', newPassword: 'password1' })
        .expect(400);
    });

    it('should return 401 when current password is wrong', async () => {
      usersService.changePassword.mockRejectedValueOnce(
        new UnauthorizedException(),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Authorization', 'Bearer valid-token')
        .send({ currentPassword: 'wrong', newPassword: 'newpass123' })
        .expect(401);
    });

    it('should return 403 for social login account', async () => {
      usersService.changePassword.mockRejectedValueOnce(
        new ForbiddenException(),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/users/me/password')
        .set('Authorization', 'Bearer valid-token')
        .send({ currentPassword: 'any', newPassword: 'newpass123' })
        .expect(403);
    });
  });
});
