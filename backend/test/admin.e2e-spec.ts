import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import {
  createTestApp,
  signupUser,
  loginUser,
  createAdminUser,
  createBar,
  createApprovedBar,
  createRejectedBar,
} from './e2e-test-helper';
import { TEST_USER_1, TEST_USER_2, TEST_ADMIN, TEST_BAR_DTO } from './test-constants';
import { initTestDb, truncateAllTables } from './e2e-setup';
import { testDataSource } from './test-data-source';

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await initTestDb();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await truncateAllTables(testDataSource);
  });

  // ─── Dashboard ──────────────────────────────────────

  describe('Dashboard', () => {
    it('should return dashboard stats', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.kpiCards).toBeDefined();
      expect(res.body.kpiCards.totalUsers).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Bar List ─────────────────────────────────────

  describe('Bar list (GET /api/v1/admin/bars)', () => {
    it('should return all bars with pagination meta', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, TEST_BAR_DTO);
      await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: 'Bar 2' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.totalItems).toBe(2);
    });

    it('should filter bars by status=PENDING', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, TEST_BAR_DTO);
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Approved Bar',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars?status=PENDING')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe('PENDING');
    });

    it('should filter bars by status=APPROVED', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, TEST_BAR_DTO);
      await createApprovedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Approved Bar',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars?status=APPROVED')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe('APPROVED');
    });

    it('should filter bars by status=REJECTED', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, TEST_BAR_DTO);
      await createRejectedBar(app, user.accessToken, admin.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Rejected Bar',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars?status=REJECTED')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe('REJECTED');
    });

    it('should search bars by name query', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: 'Unique Bar Name' });
      await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: 'Other Place' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars?q=Unique')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe('Unique Bar Name');
    });

    it('should filter bars by country', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, TEST_BAR_DTO);
      await createBar(app, user.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Japan Bar',
        country: 'Japan',
        city: 'Tokyo',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars?country=Japan')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].country).toBe('Japan');
    });

    it('should sort bars by newest first', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: 'First Bar' });
      await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: 'Second Bar' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars?sortBy=newest')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items[0].name).toBe('Second Bar');
      expect(res.body.items[1].name).toBe('First Bar');
    });

    it('should sort bars by oldest first', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: 'First Bar' });
      await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: 'Second Bar' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars?sortBy=oldest')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items[0].name).toBe('First Bar');
      expect(res.body.items[1].name).toBe('Second Bar');
    });

    it('should sort bars by name alphabetically', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: 'Zebra Bar' });
      await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: 'Alpha Bar' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars?sortBy=name')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items[0].name).toBe('Alpha Bar');
      expect(res.body.items[1].name).toBe('Zebra Bar');
    });

    it('should paginate bars with page and limit', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      for (let i = 1; i <= 6; i++) {
        await createBar(app, user.accessToken, { ...TEST_BAR_DTO, name: `Bar ${i}` });
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/bars?page=1&limit=2')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.meta.totalItems).toBe(6);
      expect(res.body.meta.totalPages).toBe(3);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
    });
  });

  // ─── Bar Detail ───────────────────────────────────

  describe('Bar detail (GET /api/v1/admin/bars/:id)', () => {
    it('should return bar detail with adminActions array', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/bars/${bar.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(bar.id);
      expect(res.body.admin).toBeDefined();
      expect(res.body.admin.actions).toBeInstanceOf(Array);
      expect(res.body.admin.actions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.admin.actions[0].actionType).toBe('BAR_APPROVED');
    });

    it('should return 404 for non-existent bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .get('/api/v1/admin/bars/999999')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(404);
    });
  });

  // ─── Bar Approve / Reject ──────────────────────────

  describe('Bar management', () => {
    it('should approve a pending bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      const approveRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Good bar' })
        .expect(200);

      expect(approveRes.body.status).toBe('APPROVED');
    });

    it('should return 409 when approving already approved bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createApprovedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(409);
    });

    it('should return 409 when approving rejected bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createRejectedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(409);
    });

    it('should return 404 when approving non-existent bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .patch('/api/v1/admin/bars/999999/approve')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(404);
    });

    it('should reject a pending bar with reason', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      const rejectRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/reject`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Low quality content' })
        .expect(200);

      expect(rejectRes.body.status).toBe('REJECTED');
    });

    it('should return 400 when reject reason is under 10 chars', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/reject`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'short' })
        .expect(400);
    });

    it('should return 400 when reject reason is missing', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/reject`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 409 when rejecting already rejected bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createRejectedBar(app, user.accessToken, admin.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/reject`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Rejecting again for test' })
        .expect(409);
    });

    it('should return 404 when rejecting non-existent bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .patch('/api/v1/admin/bars/999999/reject')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'This bar does not exist' })
        .expect(404);
    });
  });

  // ─── Bar Delete ───────────────────────────────────

  describe('Bar delete (DELETE /api/v1/admin/bars/:id)', () => {
    it('should soft delete bar and create audit log', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/bars/${bar.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Deleted for testing' })
        .expect(204);

      const actionsRes = await request(app.getHttpServer())
        .get('/api/v1/admin/actions')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const deleteAction = actionsRes.body.items.find(
        (a: any) => a.actionType === 'BAR_DELETED',
      );
      expect(deleteAction).toBeDefined();
      expect(deleteAction.targetId).toBe(bar.id);
    });

    it('should return 404 for non-existent bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .delete('/api/v1/admin/bars/999999')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(404);
    });

    it('should return 409 for already deleted bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/bars/${bar.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/bars/${bar.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(409);
    });
  });

  // ─── User List ────────────────────────────────────

  describe('User list (GET /api/v1/admin/users)', () => {
    it('should return all users with pagination meta', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      await signupUser(app, TEST_USER_1);
      await signupUser(app, TEST_USER_2);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(3);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(3);
    });

    it('should search users by name or email', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      await signupUser(app, TEST_USER_1);
      await signupUser(app, TEST_USER_2);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users?q=${TEST_USER_1.email}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].email).toBe(TEST_USER_1.email);
    });

    it('should filter users by role=ADMIN', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      await signupUser(app, TEST_USER_1);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?role=ADMIN')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((u: any) => expect(u.role).toBe('ADMIN'));
    });

    it('should filter users by isActive=true', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      // 유저 정지
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Suspended for testing purposes' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?isActive=true')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      res.body.items.forEach((u: any) => expect(u.isActive).toBe(true));
      expect(res.body.items.find((u: any) => u.id === user.user.id)).toBeUndefined();
    });

    it('should filter users by isActive=false', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Suspended for testing purposes' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?isActive=false')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((u: any) => expect(u.isActive).toBe(false));
    });

    it('should paginate users with page and limit', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      await signupUser(app, TEST_USER_1);
      await signupUser(app, TEST_USER_2);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?page=1&limit=1')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(3);
      expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(3);
    });
  });

  // ─── User Detail ──────────────────────────────────

  describe('User detail (GET /api/v1/admin/users/:id)', () => {
    it('should return user detail with barCount and recentActions', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      await createBar(app, user.accessToken, TEST_BAR_DTO);

      // 유저 정지 → 활성화하여 recentActions 생성
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Suspended for testing purposes' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/activate`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${user.user.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(user.user.id);
      expect(res.body.email).toBe(TEST_USER_1.email);
      expect(res.body.barCount).toBeGreaterThanOrEqual(1);
      expect(res.body.recentActions).toBeInstanceOf(Array);
      expect(res.body.recentActions.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .get('/api/v1/admin/users/999999')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(404);
    });
  });

  // ─── User Suspend / Activate ───────────────────────

  describe('User management', () => {
    it('suspend user → login fails → activate → login succeeds', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      const suspendRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Violated terms of service' })
        .expect(200);
      expect(suspendRes.body.isActive).toBe(false);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER_1.email, password: TEST_USER_1.password })
        .expect(403);

      const activateRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/activate`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);
      expect(activateRes.body.isActive).toBe(true);

      const relogin = await loginUser(app, {
        email: TEST_USER_1.email,
        password: TEST_USER_1.password,
      });
      expect(relogin.accessToken).toBeDefined();
    });

    it('should return 403 when suspending self', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${admin.user.id}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Trying to suspend myself' })
        .expect(403);
    });

    it('should return 409 when suspending already suspended user', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'First suspension for test' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Second suspension attempt' })
        .expect(409);
    });

    it('should return 404 when suspending non-existent user', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/999999/suspend')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'This user does not exist' })
        .expect(404);
    });

    it('should return 409 when activating already active user', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/activate`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(409);
    });

    it('should return 404 when activating non-existent user', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/999999/activate')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(404);
    });
  });

  // ─── Role Change + Audit Log ────────────────────────

  describe('Role change', () => {
    it('should change user role and create audit log', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/role`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ role: 'ADMIN', reason: 'Promoted to admin' })
        .expect(200);

      const actionsRes = await request(app.getHttpServer())
        .get('/api/v1/admin/actions')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const roleChangeAction = actionsRes.body.items.find(
        (a: any) => a.actionType === 'USER_ROLE_CHANGED',
      );
      expect(roleChangeAction).toBeDefined();
      expect(roleChangeAction.targetId).toBe(user.user.id);
    });

    it('should change admin to user role', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const admin2 = await createAdminUser(app, {
        email: 'admin2@test.com',
        password: 'Admin1234!',
        name: 'Admin2',
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${admin2.user.id}/role`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ role: 'USER', reason: 'Demoted for testing' })
        .expect(200);

      expect(res.body.role).toBe('USER');
    });

    it('should return 403 when changing own role', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${admin.user.id}/role`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ role: 'USER' })
        .expect(403);
    });

    it('should return 409 when setting same role', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/role`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ role: 'USER' })
        .expect(409);
    });

    it('should return 400 for invalid role value', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/role`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ role: 'INVALID_ROLE' })
        .expect(400);
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/999999/role')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ role: 'ADMIN' })
        .expect(404);
    });
  });

  // ─── Audit Logs ───────────────────────────────────

  describe('Audit logs (GET /api/v1/admin/actions)', () => {
    it('should filter actions by actionType', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      // 승인 + 유저 정지 → 다른 타입의 액션 생성
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${user.user.id}/suspend`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .send({ reason: 'Suspended for testing purposes' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/actions?actionType=BAR_APPROVED')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((a: any) => expect(a.actionType).toBe('BAR_APPROVED'));
    });

    it('should filter actions by adminId', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/admin/actions?adminId=${admin.user.id}`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((a: any) => expect(a.adminId).toBe(admin.user.id));
    });

    it('should paginate actions', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      // 3개 바 생성 + 승인 → 3개 감사 로그
      for (let i = 1; i <= 3; i++) {
        const bar = await createBar(app, user.accessToken, {
          ...TEST_BAR_DTO,
          name: `Bar ${i}`,
        });
        await request(app.getHttpServer())
          .patch(`/api/v1/admin/bars/${bar.id}/approve`)
          .set('Cookie', `accessToken=${admin.accessToken}`)
          .expect(200);
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/actions?page=1&limit=2')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(3);
      expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('should return actions sorted by createdAt DESC', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);

      const bar1 = await createBar(app, user.accessToken, {
        ...TEST_BAR_DTO,
        name: 'First Bar',
      });
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar1.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const bar2 = await createBar(app, user.accessToken, {
        ...TEST_BAR_DTO,
        name: 'Second Bar',
      });
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar2.id}/approve`)
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/actions')
        .set('Cookie', `accessToken=${admin.accessToken}`)
        .expect(200);

      const dates = res.body.items.map((a: any) => new Date(a.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });
  });

  // ─── Non-admin access ──────────────────────────────

  describe('Authorization', () => {
    it('should return 403 for non-admin user accessing admin endpoints', async () => {
      const user = await signupUser(app, TEST_USER_1);

      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/v1/admin/bars')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(403);
    });

    it('should return 401 for unauthenticated admin access', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .expect(401);
    });

    it('should return 403 when non-admin tries to approve bar', async () => {
      const admin = await createAdminUser(app, TEST_ADMIN);
      const user = await signupUser(app, TEST_USER_1);
      const bar = await createBar(app, user.accessToken, TEST_BAR_DTO);

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/bars/${bar.id}/approve`)
        .set('Cookie', `accessToken=${user.accessToken}`)
        .expect(403);
    });
  });
});
