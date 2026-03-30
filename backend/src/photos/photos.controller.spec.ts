import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  INestApplication,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { PhotosController } from './photos.controller.js';
import { PhotosService } from './photos.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Role } from '@my-project/shared';
import * as fs from 'fs';
import * as path from 'path';

const fixtureBuffer = fs.readFileSync(
  path.join(__dirname, '../../test/fixtures/test-image.jpg'),
);

describe('PhotosController', () => {
  let app: INestApplication;
  let photosService: {
    upload: jest.Mock;
    remove: jest.Mock;
  };

  beforeAll(async () => {
    photosService = {
      upload: jest.fn().mockResolvedValue({
        photos: [{ id: 1, url: 'https://s3.example.com/photo.jpg', order: 0 }],
      }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhotosController],
      providers: [
        { provide: PhotosService, useValue: photosService },
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/bars/:id/photos', () => {
    it('should return 201 with uploaded photos', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/bars/1/photos')
        .set('Authorization', 'Bearer valid-token')
        .attach('files', fixtureBuffer, 'test.jpg')
        .expect(201);

      expect(res.body).toHaveProperty('photos');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/bars/1/photos')
        .attach('files', fixtureBuffer, 'test.jpg')
        .expect(401);
    });

    it('should return 403 when user is not bar owner', async () => {
      photosService.upload.mockRejectedValueOnce(
        new ForbiddenException('Only the bar owner can upload photos.'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/bars/1/photos')
        .set('Authorization', 'Bearer valid-token')
        .attach('files', fixtureBuffer, 'test.jpg')
        .expect(403);
    });
  });

  describe('DELETE /api/v1/bars/:id/photos/:photoId', () => {
    it('should return 204 on successful deletion', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/bars/1/photos/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/bars/1/photos/1')
        .expect(401);
    });

    it('should return 404 for non-existent photo', async () => {
      photosService.remove.mockRejectedValueOnce(
        new NotFoundException('Photo not found.'),
      );

      await request(app.getHttpServer())
        .delete('/api/v1/bars/1/photos/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });
});
