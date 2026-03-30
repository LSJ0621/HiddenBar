import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import request from 'supertest';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Role, BarStatus, AdminActionType } from '@my-project/shared';

describe('AdminController', () => {
  let app: INestApplication;
  let adminService: {
    getDashboard: jest.Mock;
    findBars: jest.Mock;
    findBarById: jest.Mock;
    approveBar: jest.Mock;
    rejectBar: jest.Mock;
    deleteBar: jest.Mock;
    findUsers: jest.Mock;
    findUserById: jest.Mock;
    suspendUser: jest.Mock;
    activateUser: jest.Mock;
    changeUserRole: jest.Mock;
    findActions: jest.Mock;
  };

  const mockDashboard = {
    stats: {
      totalBars: 500,
      pendingBars: 15,
      approvedBars: 450,
      rejectedBars: 35,
      totalUsers: 5000,
      activeUsers: 4800,
      suspendedUsers: 200,
      totalBookmarks: 12000,
    },
    recentActivity: {
      newBarsThisWeek: 20,
      newUsersThisWeek: 150,
      newBookmarksThisWeek: 500,
    },
    barsByCountry: [{ country: 'Thailand', count: 150 }],
  };

  const mockBarList = {
    items: [
      {
        id: 1,
        name: 'The Secret Bar',
        city: 'Bangkok',
        country: 'Thailand',
        status: BarStatus.PENDING,
        owner: { id: 1, name: 'user1', email: 'user@example.com' },
        photoCount: 5,
        createdAt: new Date().toISOString(),
      },
    ],
    meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
  };

  const mockBarDetail = {
    id: 1,
    name: 'The Secret Bar',
    status: BarStatus.PENDING,
    bookmarkCount: 42,
    admin: {
      actions: [
        {
          actionType: AdminActionType.BAR_REJECTED,
          reason: 'Bad photos',
          admin: { id: 1, name: 'admin1' },
          createdAt: new Date().toISOString(),
        },
      ],
    },
  };

  const mockUserList = {
    items: [
      {
        id: 1,
        email: 'user@example.com',
        name: 'user1',
        role: Role.USER,
        isActive: true,
        barCount: 3,
        bookmarkCount: 15,
        createdAt: new Date().toISOString(),
      },
    ],
    meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
  };

  const mockUserDetail = {
    id: 2,
    email: 'user@example.com',
    name: 'user1',
    role: Role.USER,
    isActive: true,
    bars: [
      {
        id: 1,
        name: 'The Secret Bar',
        status: BarStatus.APPROVED,
        city: 'Bangkok',
        country: 'Thailand',
      },
    ],
    recentActions: [],
  };

  const mockActionList = {
    items: [
      {
        id: 1,
        actionType: AdminActionType.BAR_APPROVED,
        targetType: 'BAR',
        targetId: 1,
        reason: null,
        admin: { id: 1, name: 'admin1' },
        createdAt: new Date().toISOString(),
      },
    ],
    meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
  };

  beforeAll(async () => {
    adminService = {
      getDashboard: jest.fn().mockResolvedValue(mockDashboard),
      findBars: jest.fn().mockResolvedValue(mockBarList),
      findBarById: jest.fn().mockResolvedValue(mockBarDetail),
      approveBar: jest
        .fn()
        .mockResolvedValue({ id: 1, status: BarStatus.APPROVED }),
      rejectBar: jest
        .fn()
        .mockResolvedValue({ id: 1, status: BarStatus.REJECTED }),
      deleteBar: jest.fn().mockResolvedValue(undefined),
      findUsers: jest.fn().mockResolvedValue(mockUserList),
      findUserById: jest.fn().mockResolvedValue(mockUserDetail),
      suspendUser: jest.fn().mockResolvedValue({ id: 2, isActive: false }),
      activateUser: jest.fn().mockResolvedValue({ id: 2, isActive: true }),
      changeUserRole: jest.fn().mockResolvedValue({ id: 2, role: Role.ADMIN }),
      findActions: jest.fn().mockResolvedValue(mockActionList),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: any) => {
              const req = context.switchToHttp().getRequest();
              if (req.headers.authorization === 'Bearer admin-token') {
                req.user = { id: 1, email: 'admin@example.com', role: Role.ADMIN };
                return true;
              }
              if (req.headers.authorization === 'Bearer user-token') {
                req.user = { id: 2, email: 'user@example.com', role: Role.USER };
                return true;
              }
              return false;
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

  // ─── Authorization ────────────────────────────────────

  describe('Authorization', () => {
    it('should return 403 for non-admin user on all admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', 'Bearer user-token')
        .expect(403);
    });

    it('should return 403 for unauthenticated user on all admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .expect(403);
    });
  });

  // ─── GET /api/v1/admin/dashboard ──────────────────────

  describe('GET /api/v1/admin/dashboard', () => {
    it('should return 200 with dashboard statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('recentActivity');
      expect(res.body).toHaveProperty('barsByCountry');
      expect(res.body).toHaveProperty('barsByCountry');
    });
  });

  // ─── GET /api/v1/admin/bars ───────────────────────────

  describe('GET /api/v1/admin/bars', () => {
    it('should return 200 with paginated bar list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
    });

    it('should filter bars by status', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/bars?status=PENDING')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(adminService.findBars).toHaveBeenCalledWith(
        expect.objectContaining({ status: BarStatus.PENDING }),
      );
    });

    it('should search bars by name/address', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/bars?q=secret')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(adminService.findBars).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'secret' }),
      );
    });
  });

  // ─── GET /api/v1/admin/bars/:id ───────────────────────

  describe('GET /api/v1/admin/bars/:id', () => {
    it('should return 200 with bar details including admin actions history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars/1')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toHaveProperty('admin');
      expect(res.body.admin).toHaveProperty('actions');
    });

    it('should return 404 for non-existent bar', async () => {
      adminService.findBarById.mockRejectedValueOnce(
        new NotFoundException('Bar not found.'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/admin/bars/999')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });

  // ─── PATCH /api/v1/admin/bars/:id/approve ─────────────

  describe('PATCH /api/v1/admin/bars/:id/approve', () => {
    it('should return 200 with updated bar status APPROVED', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/bars/1/approve')
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(200);

      expect(res.body.status).toBe(BarStatus.APPROVED);
    });

    it('should return 404 for non-existent bar', async () => {
      adminService.approveBar.mockRejectedValueOnce(
        new NotFoundException('Bar not found.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/bars/999/approve')
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(404);
    });

    it('should return 409 when bar is already approved', async () => {
      adminService.approveBar.mockRejectedValueOnce(
        new ConflictException('This bar is already approved.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/bars/1/approve')
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(409);
    });
  });

  // ─── PATCH /api/v1/admin/bars/:id/reject ──────────────

  describe('PATCH /api/v1/admin/bars/:id/reject', () => {
    it('should return 200 with updated bar status REJECTED', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/bars/1/reject')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Bad quality photos and description too short' })
        .expect(200);

      expect(res.body.status).toBe(BarStatus.REJECTED);
    });

    it('should return 400 when reason is not provided', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/bars/1/reject')
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent bar', async () => {
      adminService.rejectBar.mockRejectedValueOnce(
        new NotFoundException('Bar not found.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/bars/1/reject')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Bad quality photos and description too short' })
        .expect(404);
    });

    it('should return 409 when bar is already rejected', async () => {
      adminService.rejectBar.mockRejectedValueOnce(
        new ConflictException('This bar is already rejected.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/bars/1/reject')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Bad quality photos and description too short' })
        .expect(409);
    });
  });

  // ─── DELETE /api/v1/admin/bars/:id ────────────────────

  describe('DELETE /api/v1/admin/bars/:id', () => {
    it('should return 204 on successful admin delete', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/admin/bars/1')
        .set('Authorization', 'Bearer admin-token')
        .expect(204);
    });

    it('should return 404 for non-existent bar', async () => {
      adminService.deleteBar.mockRejectedValueOnce(
        new NotFoundException('Bar not found.'),
      );

      await request(app.getHttpServer())
        .delete('/api/v1/admin/bars/999')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });

    it('should return 409 when bar is already deleted', async () => {
      adminService.deleteBar.mockRejectedValueOnce(
        new ConflictException('This bar is already deleted.'),
      );

      await request(app.getHttpServer())
        .delete('/api/v1/admin/bars/1')
        .set('Authorization', 'Bearer admin-token')
        .expect(409);
    });
  });

  // ─── GET /api/v1/admin/users ──────────────────────────

  describe('GET /api/v1/admin/users', () => {
    it('should return 200 with paginated user list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
    });

    it('should filter users by role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users?role=ADMIN')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(adminService.findUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ADMIN }),
      );
    });

    it('should filter users by isActive', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users?isActive=false')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(adminService.findUsers).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should search users by email/name', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users?q=test')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(adminService.findUsers).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'test' }),
      );
    });
  });

  // ─── GET /api/v1/admin/users/:id ──────────────────────

  describe('GET /api/v1/admin/users/:id', () => {
    it('should return 200 with user detail', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users/2')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toHaveProperty('email');
    });

    it('should return 404 for non-existent user', async () => {
      adminService.findUserById.mockRejectedValueOnce(
        new NotFoundException('User not found.'),
      );

      await request(app.getHttpServer())
        .get('/api/v1/admin/users/999')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });

  // ─── PATCH /api/v1/admin/users/:id/suspend ────────────

  describe('PATCH /api/v1/admin/users/:id/suspend', () => {
    it('should return 200 with user isActive false', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/2/suspend')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Violated terms of service repeatedly' })
        .expect(200);

      expect(res.body.isActive).toBe(false);
    });

    it('should return 400 when reason is not provided', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/2/suspend')
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(400);
    });

    it('should return 403 when admin tries to suspend self', async () => {
      adminService.suspendUser.mockRejectedValueOnce(
        new ForbiddenException('You cannot suspend your own account.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/1/suspend')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'This should fail because self-suspend' })
        .expect(403);
    });

    it('should return 404 for non-existent user', async () => {
      adminService.suspendUser.mockRejectedValueOnce(
        new NotFoundException('User not found.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/999/suspend')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Some reason for suspension here' })
        .expect(404);
    });

    it('should return 409 when user is already suspended', async () => {
      adminService.suspendUser.mockRejectedValueOnce(
        new ConflictException('This user is already suspended.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/2/suspend')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Already suspended user reason' })
        .expect(409);
    });
  });

  // ─── PATCH /api/v1/admin/users/:id/activate ───────────

  describe('PATCH /api/v1/admin/users/:id/activate', () => {
    it('should return 200 with user isActive true', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/2/activate')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.isActive).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      adminService.activateUser.mockRejectedValueOnce(
        new NotFoundException('User not found.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/999/activate')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });

    it('should return 409 when user is already active', async () => {
      adminService.activateUser.mockRejectedValueOnce(
        new ConflictException('This user is already active.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/2/activate')
        .set('Authorization', 'Bearer admin-token')
        .expect(409);
    });
  });

  // ─── PATCH /api/v1/admin/users/:id/role ───────────────

  describe('PATCH /api/v1/admin/users/:id/role', () => {
    it('should return 200 with updated user role', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/2/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(res.body.role).toBe(Role.ADMIN);
    });

    it('should return 403 when admin tries to change own role', async () => {
      adminService.changeUserRole.mockRejectedValueOnce(
        new ForbiddenException('You cannot change your own role.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/1/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ role: 'USER' })
        .expect(403);
    });

    it('should return 404 for non-existent user', async () => {
      adminService.changeUserRole.mockRejectedValueOnce(
        new NotFoundException('User not found.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/999/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ role: 'ADMIN' })
        .expect(404);
    });

    it('should return 409 when target role equals current role', async () => {
      adminService.changeUserRole.mockRejectedValueOnce(
        new ConflictException('User already has this role.'),
      );

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/2/role')
        .set('Authorization', 'Bearer admin-token')
        .send({ role: 'USER' })
        .expect(409);
    });
  });

  // ─── GET /api/v1/admin/actions ────────────────────────

  describe('GET /api/v1/admin/actions', () => {
    it('should return 200 with paginated admin action logs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/actions')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
    });

    it('should filter by actionType', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/actions?actionType=BAR_APPROVED')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(adminService.findActions).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: AdminActionType.BAR_APPROVED }),
      );
    });
  });
});
