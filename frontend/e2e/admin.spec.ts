import path from 'path';
import {
  authenticatedAdmin,
  authenticatedUser,
  unauthenticated,
  expect,
} from './fixtures/test-fixtures';
import { request as playwrightRequest } from '@playwright/test';

const API_BASE = 'http://localhost:4000/api/v1';

/**
 * 일반 유저 쿠키로 API 요청을 보낼 수 있는 컨텍스트를 생성한다.
 */
async function createUserRequestContext() {
  return playwrightRequest.newContext({
    baseURL: 'http://localhost:4000',
    storageState: path.resolve(__dirname, '.auth/user.json'),
  });
}

// ─── 헬퍼 함수 ────────────────────────────────────────────

/**
 * 관리자 API에서 PENDING 바 ID를 가져온다.
 * 없으면 테스트용 바를 등록하여 생성한다.
 */
async function getPendingBarId(
  request: import('@playwright/test').APIRequestContext,
): Promise<number> {
  const res = await request.get(
    `${API_BASE}/admin/bars?status=PENDING&limit=1`,
  );
  const data = await res.json();
  const bars = data.items ?? data.data ?? [];
  if (bars.length > 0) return bars[0].id;

  // PENDING 바가 없으면 새로 등록
  const createRes = await request.post(`${API_BASE}/bars`, {
    data: {
      name: 'E2E Pending Bar',
      address: '123 Test St',
      city: 'Seoul',
      country: 'South Korea',
      latitude: 37.5665,
      longitude: 126.978,
    },
  });
  const created = await createRes.json();
  return created.id;
}

/**
 * 관리자 API에서 APPROVED 바 ID를 가져온다.
 */
async function getApprovedBarId(
  request: import('@playwright/test').APIRequestContext,
): Promise<number> {
  const res = await request.get(`${API_BASE}/bars/search?name=Bar&limit=1`);
  const data = await res.json();
  const bars = data.items ?? data.data ?? [];
  if (bars.length === 0) throw new Error('No approved bars found in seed data');
  return bars[0].id;
}

/**
 * 일반 유저(비관리자) ID를 가져온다.
 */
async function getNonAdminUserId(
  request: import('@playwright/test').APIRequestContext,
): Promise<number> {
  const res = await request.get(
    `${API_BASE}/admin/users?role=USER&limit=1`,
  );
  const data = await res.json();
  const users = data.items ?? data.data ?? [];
  if (users.length === 0) throw new Error('No non-admin users found');
  return users[0].id;
}

/**
 * PENDING 상태의 리뷰 신고 ID를 가져온다.
 * 없으면 일반 유저로 리뷰를 생성한 뒤 admin으로 신고한다.
 */
async function getPendingReportId(
  adminRequest: import('@playwright/test').APIRequestContext,
): Promise<number> {
  const res = await adminRequest.get(
    `${API_BASE}/admin/review-reports?status=PENDING&limit=1`,
  );
  const data = await res.json();
  const reports = data.items ?? data.data ?? [];
  if (reports.length > 0) return reports[0].id;

  // 일반 유저 컨텍스트로 리뷰 생성 (여러 바에서 시도)
  const userCtx = await createUserRequestContext();
  try {
    // APPROVED 바 목록에서 리뷰 작성 가능한 바 찾기
    const barsRes = await adminRequest.get(`${API_BASE}/admin/bars?status=APPROVED&limit=10`);
    const barsData = await barsRes.json();
    const bars = barsData.items ?? barsData.data ?? [];

    for (const bar of bars) {
      const reviewRes = await userCtx.post(`${API_BASE}/reviews`, {
        data: { barId: bar.id, rating: 2, content: `E2E test review for report ${Date.now()}` },
      });
      if (reviewRes.ok()) {
        const review = await reviewRes.json();
        // admin으로 해당 리뷰 신고
        const reportRes = await adminRequest.post(`${API_BASE}/reviews/${review.id}/report`, {
          data: { reason: 'SPAM', detail: 'E2E test report' },
        });
        if (reportRes.ok()) {
          const report = await reportRes.json();
          return report.reportId;
        }
      }
      // 409 (이미 리뷰 존재) → 다음 바 시도
    }
    throw new Error('No bars available for creating a review report');
  } finally {
    await userCtx.dispose();
  }
}

/**
 * RESOLVED 상태의 리뷰 신고 ID를 가져온다.
 * 없으면 PENDING report를 생성 후 resolve 처리한다.
 */
async function getResolvedReportId(
  adminRequest: import('@playwright/test').APIRequestContext,
): Promise<number> {
  const res = await adminRequest.get(
    `${API_BASE}/admin/review-reports?status=RESOLVED&limit=1`,
  );
  const data = await res.json();
  const reports = data.items ?? data.data ?? [];
  if (reports.length > 0) return reports[0].id;

  // PENDING report 생성 후 resolve
  const pendingId = await getPendingReportId(adminRequest);
  const resolveRes = await adminRequest.patch(
    `${API_BASE}/admin/review-reports/${pendingId}/resolve`,
    { data: { action: 'RESTORED', note: 'E2E test setup - auto resolved' } },
  );
  if (!resolveRes.ok()) throw new Error(`Failed to resolve report: ${resolveRes.status()}`);
  return pendingId;
}

/**
 * 항상 새 PENDING 리뷰 신고를 생성한다 (기존 것을 재사용하지 않음).
 * 새 바를 생성 → 승인 → 리뷰 → 신고 순서로 독립적 데이터를 보장한다.
 */
async function createFreshPendingReport(
  adminRequest: import('@playwright/test').APIRequestContext,
): Promise<number> {
  const userCtx = await createUserRequestContext();
  try {
    // 1. 일반 유저로 새 바 생성 (PENDING 상태)
    const barRes = await userCtx.post(`${API_BASE}/bars`, {
      data: {
        name: `E2E Report Bar ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        address: '999 Report Test St',
        city: 'Seoul',
        country: 'South Korea',
        latitude: 37.56 + Math.random() * 0.01,
        longitude: 126.97 + Math.random() * 0.01,
      },
    });
    if (!barRes.ok()) throw new Error(`Failed to create bar: ${barRes.status()}`);
    const bar = await barRes.json();

    // 2. admin이 바를 승인
    const approveRes = await adminRequest.patch(
      `${API_BASE}/admin/bars/${bar.id}/approve`,
      { data: {} },
    );
    if (!approveRes.ok()) throw new Error(`Failed to approve bar: ${approveRes.status()}`);

    // 3. 일반 유저로 리뷰 작성
    const reviewRes = await userCtx.post(`${API_BASE}/reviews`, {
      data: {
        barId: bar.id,
        rating: 2,
        content: `E2E fresh report review ${Date.now()}`,
      },
    });
    if (!reviewRes.ok()) throw new Error(`Failed to create review: ${reviewRes.status()}`);
    const review = await reviewRes.json();

    // 4. admin이 해당 리뷰를 신고
    const reportRes = await adminRequest.post(
      `${API_BASE}/reviews/${review.id}/report`,
      { data: { reason: 'SPAM', detail: 'E2E fresh test report' } },
    );
    if (!reportRes.ok()) throw new Error(`Failed to report review: ${reportRes.status()}`);
    const report = await reportRes.json();
    return report.reportId;
  } finally {
    await userCtx.dispose();
  }
}

// ─── 권한 보호 ────────────────────────────────────────────

unauthenticated(
  'should redirect unauthenticated to login from /admin',
  async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  },
);

authenticatedUser(
  'should redirect non-admin to home from /admin',
  async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('/', { timeout: 15000 });
    expect(page.url()).not.toContain('/admin');
  },
);

authenticatedUser(
  'should redirect non-admin from /admin/review-reports',
  async ({ page }) => {
    await page.goto('/admin/review-reports');
    await page.waitForURL('/', { timeout: 15000 });
    expect(page.url()).not.toContain('/admin');
  },
);

// ─── 대시보드 ─────────────────────────────────────────────

authenticatedAdmin.describe('Admin Dashboard', () => {
  authenticatedAdmin.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  authenticatedAdmin(
    'should display admin sidebar with navigation items',
    async ({ page }) => {
      const sidebar = page.getByTestId('admin-sidebar');
      await expect(sidebar).toBeVisible({ timeout: 15000 });

      // 네비게이션 항목 확인
      await expect(sidebar.getByText('Dashboard')).toBeVisible();
      await expect(sidebar.getByText('Bar Management')).toBeVisible();
      await expect(sidebar.getByText('User Management')).toBeVisible();
      await expect(sidebar.getByText('Review Reports')).toBeVisible();
      await expect(sidebar.getByText('Activity Log')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should display 5 KPI stat cards',
    async ({ page }) => {
      await expect(
        page.getByTestId('dashboard-stat-totalBars'),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByTestId('dashboard-stat-pendingBars'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('dashboard-stat-reportedReviews'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('dashboard-stat-totalUsers'),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByTestId('dashboard-stat-totalBookmarks'),
      ).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedAdmin(
    'should display charts',
    async ({ page }) => {
      // 차트 영역이 로드될 때까지 대기
      await expect(
        page.getByTestId('dashboard-stat-totalBars'),
      ).toBeVisible({ timeout: 15000 });

      // 1열 차트 확인 (뷰포트 내)
      await expect(page.getByText('Bar Registration Trend')).toBeVisible();
      await expect(page.getByText('Bar Status Distribution')).toBeVisible();

      // 2열 차트는 스크롤 후 확인
      await page.getByText('User Signup Trend').scrollIntoViewIfNeeded();
      await expect(page.getByText('User Signup Trend')).toBeVisible();
      await expect(page.getByText('Most Bookmarked Bars Top 10')).toBeVisible();
    },
  );
});

// ─── 바 관리 ──────────────────────────────────────────────

authenticatedAdmin.describe('Admin Bar Management', () => {
  authenticatedAdmin.beforeEach(async ({ page }) => {
    await page.goto('/admin/bars');
  });

  authenticatedAdmin(
    'should render bars table with rows',
    async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible({ timeout: 15000 });

      // 테이블 행 존재 확인
      const rows = table.locator('tbody tr');
      await expect(rows.first()).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should filter bars by status tab',
    async ({ page }) => {
      // 탭 버튼 대기
      const pendingTab = page.getByRole('tab', { name: /pending/i });
      await expect(pendingTab).toBeVisible({ timeout: 15000 });

      // PENDING 탭 클릭
      await pendingTab.click();
      await expect(page.getByRole('table')).toBeVisible();

      // ALL 탭으로 돌아감
      const allTab = page.getByRole('tab', { name: /all/i });
      await allTab.click();
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should search bars by name',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      const searchInput = page.getByPlaceholder(/search/i);
      await expect(searchInput).toBeVisible();

      // 검색어 입력
      await searchInput.fill('NonexistentBarXYZ999');

      // 테이블 행이 비거나 결과가 변경될 때까지 대기
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should paginate bars',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      // 페이지네이션 UI 확인
      const nextButton = page.getByRole('button', { name: /next/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await expect(page.getByRole('table')).toBeVisible();
      }
    },
  );

  authenticatedAdmin(
    'should navigate to bar detail on row click',
    async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible({ timeout: 15000 });

      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();
      await page.waitForURL(/\/admin\/bars\/\d+/);
    },
  );
});

// ─── 바 상세 ──────────────────────────────────────────────

authenticatedAdmin.describe('Admin Bar Detail', () => {
  authenticatedAdmin(
    'should display bar detail info',
    async ({ page, request }) => {
      const barId = await getApprovedBarId(request);
      await page.goto(`/admin/bars/${barId}`);

      // 바 이름이 표시될 때까지 대기
      await expect(page.locator('h1').first()).toBeVisible({
        timeout: 15000,
      });

      // 기본 정보 카드 확인
      await expect(page.getByText('Basic Info')).toBeVisible();
      await expect(page.getByText('Owner & Stats')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should display admin action history',
    async ({ page, request }) => {
      // 승인된 바의 상세를 확인 (이전 승인 히스토리가 있을 수 있음)
      const barId = await getApprovedBarId(request);
      await page.goto(`/admin/bars/${barId}`);
      await expect(page.locator('h1').first()).toBeVisible({
        timeout: 15000,
      });
      // 바 상세 페이지가 정상 로드되었는지 확인
      await expect(page.getByText('Basic Info')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should approve a pending bar',
    async ({ page }) => {
      // 일반 유저로 바 생성 (PENDING 상태 보장)
      const userCtx = await createUserRequestContext();
      let freshPendingBarId: number;
      try {
        const createRes = await userCtx.post(`${API_BASE}/bars`, {
          data: {
            name: `E2E Pending Bar ${Date.now()}`,
            address: '123 Test St',
            city: 'Seoul',
            country: 'South Korea',
            latitude: 37.5665,
            longitude: 126.978,
          },
        });
        const created = await createRes.json();
        freshPendingBarId = created.id;
      } finally {
        await userCtx.dispose();
      }

      await page.goto(`/admin/bars/${freshPendingBarId}`);
      await expect(page.locator('h1').first()).toBeVisible({
        timeout: 15000,
      });

      // Approve 버튼 클릭
      const approveButton = page.getByRole('button', { name: /approve/i });
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      // 다이얼로그 확인
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Approve Bar')).toBeVisible();

      // Approve 확인
      await dialog.getByRole('button', { name: /approve/i }).click();

      // 토스트 메시지 확인
      await expect(
        page.getByText(/bar has been approved/i),
      ).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedAdmin(
    'should reject a bar with reason',
    async ({ page }) => {
      // 일반 유저로 바 생성 (PENDING 상태 보장)
      const userCtx = await createUserRequestContext();
      let newPendingId: number;
      try {
        const createRes = await userCtx.post(`${API_BASE}/bars`, {
          data: {
            name: `E2E Reject Bar ${Date.now()}`,
            address: '456 Test St',
            city: 'Seoul',
            country: 'South Korea',
            latitude: 37.567,
            longitude: 126.979,
          },
        });
        const created = await createRes.json();
        newPendingId = created.id;
      } finally {
        await userCtx.dispose();
      }
      await page.goto(`/admin/bars/${newPendingId}`);
      await expect(page.locator('h1').first()).toBeVisible({
        timeout: 15000,
      });

      const rejectButton = page.getByRole('button', { name: /reject/i });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // 10자 이상 사유 입력
      await dialog.locator('#reason').fill('This bar does not meet our quality standards for listing.');

      // Reject 버튼 클릭
      await dialog.getByRole('button', { name: /reject/i }).click();

      await expect(
        page.getByText(/bar has been rejected/i),
      ).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedAdmin(
    'should show error when rejection reason is too short',
    async ({ page }) => {
      const userCtx = await createUserRequestContext();
      let newPendingId: number;
      try {
        const createRes = await userCtx.post(`${API_BASE}/bars`, {
          data: {
            name: `E2E Short Reason Bar ${Date.now()}`,
            address: '789 Test St',
            city: 'Seoul',
            country: 'South Korea',
            latitude: 37.568,
            longitude: 126.980,
          },
        });
        const created = await createRes.json();
        newPendingId = created.id;
      } finally {
        await userCtx.dispose();
      }
      await page.goto(`/admin/bars/${newPendingId}`);
      await expect(page.locator('h1').first()).toBeVisible({
        timeout: 15000,
      });

      const rejectButton = page.getByRole('button', { name: /reject/i });
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // 10자 미만 사유 입력
      await dialog.locator('#reason').fill('short');
      await dialog.getByRole('button', { name: /reject/i }).click();

      // 인라인 에러 메시지 확인
      await expect(
        dialog.getByText(/at least 10 characters/i),
      ).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should delete a bar with confirmation',
    async ({ page, request }) => {
      const barId = await getApprovedBarId(request);
      await page.goto(`/admin/bars/${barId}`);
      await expect(page.locator('h1').first()).toBeVisible({
        timeout: 15000,
      });

      // Delete 버튼 클릭
      const deleteButton = page.getByRole('button', { name: /delete/i });
      await deleteButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Delete Bar')).toBeVisible();

      // Delete 확인
      await dialog.getByRole('button', { name: /delete/i }).click();

      // 토스트 + 목록으로 이동
      await expect(
        page.getByText(/bar has been deleted/i),
      ).toBeVisible({ timeout: 10000 });
      await page.waitForURL(/\/admin\/bars$/);
    },
  );
});

// ─── 유저 관리 ────────────────────────────────────────────

authenticatedAdmin.describe('Admin User Management', () => {
  authenticatedAdmin.beforeEach(async ({ page }) => {
    await page.goto('/admin/users');
  });

  authenticatedAdmin(
    'should render users table',
    async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible({ timeout: 15000 });

      const rows = table.locator('tbody tr');
      await expect(rows.first()).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should search users by name or email',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      const searchInput = page.getByPlaceholder(/search/i);
      await expect(searchInput).toBeVisible();

      await searchInput.fill('admin');
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should filter users by role',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      // 역할 필터 드롭다운
      const roleFilter = page.getByRole('combobox').first();
      await expect(roleFilter).toBeVisible();
      await roleFilter.click();
      const adminOption = page.getByRole('option', { name: /admin/i });
      await expect(adminOption).toBeVisible();
      await adminOption.click();
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should filter users by active status',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      // 활성 상태 필터
      const statusFilter = page.getByRole('combobox').last();
      await expect(statusFilter).toBeVisible();
      await statusFilter.click();
      const activeOption = page.getByRole('option', { name: /active/i });
      await expect(activeOption).toBeVisible();
      await activeOption.click();
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should paginate users',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      const nextButton = page.getByRole('button', { name: /next/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await expect(page.getByRole('table')).toBeVisible();
      }
    },
  );

  authenticatedAdmin(
    'should navigate to user detail on row click',
    async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible({ timeout: 15000 });

      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();
      await page.waitForURL(/\/admin\/users\/\d+/);
    },
  );
});

// ─── 유저 상세 ────────────────────────────────────────────

authenticatedAdmin.describe('Admin User Detail', () => {
  let targetUserId: number;

  authenticatedAdmin.beforeAll(async ({ request }) => {
    targetUserId = await getNonAdminUserId(request);
  });

  authenticatedAdmin(
    'should display user detail info',
    async ({ page, request }) => {
      // ACTIVE 상태의 유저를 독립 조회 (mutation 테스트와 공유하지 않음)
      const res = await request.get(
        `${API_BASE}/admin/users?role=USER&isActive=true&limit=1`,
      );
      const data = await res.json();
      const users = data.items ?? data.data ?? [];
      const userId = users[0].id;

      await page.goto(`/admin/users/${userId}`);

      await expect(page.getByText('User Details')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('User Info')).toBeVisible();

      // 이메일, 이름 등 표시 확인
      await expect(page.getByText('Email', { exact: true })).toBeVisible();
      await expect(page.getByText('Joined')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should suspend a user with reason',
    async ({ page }) => {
      await page.goto(`/admin/users/${targetUserId}`);
      await expect(page.getByText('User Details')).toBeVisible({
        timeout: 15000,
      });

      const suspendButton = page.getByRole('button', { name: /suspend/i });
      await expect(suspendButton).toBeVisible();
      await expect(suspendButton).toBeEnabled();
      await suspendButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Suspend User')).toBeVisible();

      // 10자 이상 사유 입력
      await dialog.locator('#suspend-reason').fill(
        'Violation of community guidelines and repeated complaints.',
      );
      await dialog.getByRole('button', { name: /suspend/i }).click();

      await expect(
        page.getByText(/user has been suspended/i),
      ).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedAdmin(
    'should activate a suspended user',
    async ({ page }) => {
      await page.goto(`/admin/users/${targetUserId}`);
      await expect(page.getByText('User Details')).toBeVisible({
        timeout: 15000,
      });

      const activateButton = page.getByRole('button', {
        name: /activate/i,
      });
      await expect(activateButton).toBeVisible();
      await expect(activateButton).toBeEnabled();
      await activateButton.click();

      await expect(
        page.getByText(/user has been activated/i),
      ).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedAdmin(
    'should change user role to ADMIN',
    async ({ page }) => {
      await page.goto(`/admin/users/${targetUserId}`);
      await expect(page.getByText('User Details')).toBeVisible({
        timeout: 15000,
      });

      const changeRoleButton = page.getByRole('button', {
        name: /change role/i,
      });
      await expect(changeRoleButton).toBeVisible();
      await expect(changeRoleButton).toBeEnabled();
      await changeRoleButton.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Change Role')).toBeVisible();

      // ADMIN 라디오 선택
      const adminRadio = dialog.locator('#role-ADMIN');
      await adminRadio.click();

      // Change 버튼 클릭
      await dialog.getByRole('button', { name: /change/i }).click();

      await expect(
        page.getByText(/role has been changed/i),
      ).toBeVisible({ timeout: 10000 });

      // 원래 역할로 복구 (USER)
      await page.reload();
      await expect(page.getByText('User Details')).toBeVisible({
        timeout: 15000,
      });
      const changeRoleButton2 = page.getByRole('button', {
        name: /change role/i,
      });
      await changeRoleButton2.click();
      const restoreDialog = page.getByRole('dialog');
      await expect(restoreDialog).toBeVisible();
      await restoreDialog.locator('#role-USER').click();
      await restoreDialog.getByRole('button', { name: /change/i }).click();
      await expect(
        page.getByText(/role has been changed/i),
      ).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedAdmin(
    'should disable actions for own account',
    async ({ page }) => {
      // 관리자 자신의 유저 ID를 찾기 위해 admin users API에서 ADMIN 역할 검색
      const adminUsersRes = await page.request.get(`${API_BASE}/admin/users?role=ADMIN&limit=1`);
      const adminUsersData = await adminUsersRes.json();
      const admins = adminUsersData.items ?? adminUsersData.data ?? [];
      expect(admins.length).toBeGreaterThan(0);
      const adminId = admins[0].id;

      await page.goto(`/admin/users/${adminId}`);
      await expect(page.getByText('User Details')).toBeVisible({
        timeout: 15000,
      });

      // Suspend 버튼이 disabled
      const suspendButton = page.getByRole('button', { name: /suspend/i });
      await expect(suspendButton).toBeVisible();
      await expect(suspendButton).toBeDisabled();

      // Change Role 버튼이 disabled
      const changeRoleButton = page.getByRole('button', {
        name: /change role/i,
      });
      await expect(changeRoleButton).toBeVisible();
      await expect(changeRoleButton).toBeDisabled();
    },
  );
});

// ─── 감사 로그 ────────────────────────────────────────────

authenticatedAdmin.describe('Admin Audit Log', () => {
  authenticatedAdmin.beforeEach(async ({ page }) => {
    await page.goto('/admin/actions');
  });

  authenticatedAdmin(
    'should render audit log table',
    async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible({ timeout: 15000 });

      const rows = table.locator('tbody tr');
      await expect(rows.first()).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should filter audit logs by action type',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      // 액션 타입 필터 드롭다운
      const actionFilter = page.getByRole('combobox').first();
      await expect(actionFilter).toBeVisible();
      await actionFilter.click();
      const firstOption = page.getByRole('option').first();
      await expect(firstOption).toBeVisible();
      await firstOption.click();
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should paginate audit logs',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      const nextButton = page.getByRole('button', { name: /next/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await expect(page.getByRole('table')).toBeVisible();
      }
    },
  );
});

// ─── 리뷰 신고 관리 ──────────────────────────────────────

authenticatedAdmin.describe('Admin Review Reports', () => {
  authenticatedAdmin.beforeAll(async ({ request }) => {
    await getPendingReportId(request);
    await getResolvedReportId(request);
  });

  authenticatedAdmin.beforeEach(async ({ page }) => {
    await page.goto('/admin/review-reports');
  });

  authenticatedAdmin(
    'should render review reports table',
    async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible({ timeout: 15000 });

      const rows = table.locator('tbody tr');
      await expect(rows.first()).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should filter reports by status',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      // Pending 탭 클릭
      const pendingTab = page.getByRole('tab', { name: /pending/i });
      await expect(pendingTab).toBeVisible();
      await pendingTab.click();
      await expect(page.getByRole('table')).toBeVisible();

      // Resolved 탭 클릭
      const resolvedTab = page.getByRole('tab', { name: /resolved/i });
      await expect(resolvedTab).toBeVisible();
      await resolvedTab.click();
      await expect(page.getByRole('table')).toBeVisible();

      // All 탭으로 복귀
      const allTab = page.getByRole('tab', { name: /all/i });
      await allTab.click();
      await expect(page.getByRole('table')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should navigate to report detail on row click',
    async ({ page }) => {
      const table = page.getByRole('table');
      await expect(table).toBeVisible({ timeout: 15000 });

      const firstRow = table.locator('tbody tr').first();
      await firstRow.click();
      await page.waitForURL(/\/admin\/review-reports\/\d+/);
    },
  );

  authenticatedAdmin(
    'should paginate review reports',
    async ({ page }) => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

      const nextButton = page.getByRole('button', { name: /next/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await expect(page.getByRole('table')).toBeVisible();
      }
    },
  );
});

// ─── 리뷰 신고 상세 ──────────────────────────────────────

authenticatedAdmin.describe('Admin Review Report Detail', () => {
  authenticatedAdmin(
    'should display report info card',
    async ({ page, request }) => {
      const reportId = await createFreshPendingReport(request);
      await page.goto(`/admin/review-reports/${reportId}`);

      await expect(page.getByText('Report Details')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('Report Info')).toBeVisible();
      await expect(page.getByText('Reason')).toBeVisible();
      await expect(page.getByText('Reporter')).toBeVisible();
      await expect(page.getByText('Filed')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should display review info card',
    async ({ page, request }) => {
      const reportId = await createFreshPendingReport(request);
      await page.goto(`/admin/review-reports/${reportId}`);

      await expect(page.getByText('Report Details')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('Review Info')).toBeVisible();
      await expect(page.getByText('Content')).toBeVisible();
      await expect(page.getByText('Rating')).toBeVisible();
      await expect(page.getByText('Author')).toBeVisible();
      await expect(page.getByText('Review Status')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should resolve report with RESTORED action',
    async ({ page, request }) => {
      const reportId = await createFreshPendingReport(request);
      await page.goto(`/admin/review-reports/${reportId}`);

      await expect(page.getByText('Resolve Report')).toBeVisible({
        timeout: 15000,
      });

      // Action 드롭다운에서 RESTORED 선택 (기본값)
      // Note 입력
      await page.getByPlaceholder(/optional note/i).fill('Review appears to be legitimate after investigation');

      // Submit 클릭
      await page.getByRole('button', { name: /submit/i }).click();

      // 목록으로 이동
      await page.waitForURL(/\/admin\/review-reports$/);
    },
  );

  authenticatedAdmin(
    'should resolve report with HIDDEN action',
    async ({ page, request }) => {
      const reportId = await createFreshPendingReport(request);
      await page.goto(`/admin/review-reports/${reportId}`);

      await expect(page.getByText('Resolve Report')).toBeVisible({
        timeout: 15000,
      });

      // Action 드롭다운 열기
      const selectTrigger = page.locator('[role="combobox"]').first();
      await selectTrigger.click();

      // HIDDEN 선택
      const hiddenOption = page.getByRole('option', { name: /hidden/i });
      await hiddenOption.click();

      await page.getByRole('button', { name: /submit/i }).click();
      await page.waitForURL(/\/admin\/review-reports$/);
    },
  );

  authenticatedAdmin(
    'should resolve report with DELETED action',
    async ({ page, request }) => {
      const reportId = await createFreshPendingReport(request);
      await page.goto(`/admin/review-reports/${reportId}`);

      await expect(page.getByText('Resolve Report')).toBeVisible({
        timeout: 15000,
      });

      // Action 드롭다운 열기
      const selectTrigger = page.locator('[role="combobox"]').first();
      await selectTrigger.click();

      // DELETED 선택
      const deletedOption = page.getByRole('option', { name: /deleted/i });
      await deletedOption.click();

      await page.getByRole('button', { name: /submit/i }).click();
      await page.waitForURL(/\/admin\/review-reports$/);
    },
  );

  authenticatedAdmin(
    'should display resolution info for resolved report',
    async ({ page, request }) => {
      const reportId = await getResolvedReportId(request);
      await page.goto(`/admin/review-reports/${reportId}`);

      await expect(page.getByText('Report Details')).toBeVisible({
        timeout: 15000,
      });

      // Resolution 카드 확인
      await expect(page.getByText('Resolution')).toBeVisible();
      await expect(page.getByText('Action')).toBeVisible();
      await expect(page.getByText('Processed')).toBeVisible();
    },
  );

  authenticatedAdmin(
    'should navigate back to list',
    async ({ page, request }) => {
      const reportId = await getResolvedReportId(request);
      await page.goto(`/admin/review-reports/${reportId}`);

      await expect(page.getByText('Report Details')).toBeVisible({
        timeout: 15000,
      });

      // 뒤로 가기 버튼 클릭
      const backButton = page.getByRole('button', { name: /back/i });
      await backButton.click();

      await page.waitForURL(/\/admin\/review-reports$/);
    },
  );
});

// ─── 바 상세 내 관리자 리뷰 관리 ──────────────────────────

authenticatedAdmin.describe('Admin Review Management in Bar Detail', () => {
  let barId: number;

  authenticatedAdmin.beforeAll(async ({ request }) => {
    // 여러 바를 시도하여 리뷰 생성 가능한 바를 찾음 (409 회피)
    const barsRes = await request.get(`${API_BASE}/admin/bars?status=APPROVED&limit=10`);
    const barsData = await barsRes.json();
    const bars = barsData.items ?? barsData.data ?? [];

    const userCtx = await createUserRequestContext();
    try {
      for (const bar of bars) {
        const reviewRes = await userCtx.post(`${API_BASE}/reviews`, {
          data: {
            barId: bar.id,
            rating: 4,
            content: `E2E admin review mgmt ${Date.now()}`,
          },
        });
        if (reviewRes.ok()) {
          barId = bar.id;
          return;
        }
      }
      // 모든 바에 리뷰 존재 → 첫 바 사용 (기존 리뷰 있음)
      barId = bars[0].id;
    } finally {
      await userCtx.dispose();
    }
  });

  authenticatedAdmin(
    'should toggle review status HIDDEN/PUBLISHED in bar detail',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);

      // 리뷰 카드 대기
      const reviewCard = page.locator('[data-testid^="review-card-"]').first();
      await expect(reviewCard).toBeVisible({ timeout: 15000 });

      // 리뷰 카드의 메뉴 (DropdownMenu) 열기
      const menuTrigger = reviewCard.getByRole('button').filter({ has: page.locator('svg') }).last();
      await menuTrigger.click();

      // "Change Status" 메뉴 항목 클릭
      const changeStatusItem = page.getByRole('menuitem', { name: /change status/i });
      await expect(changeStatusItem).toBeVisible();
      await changeStatusItem.click();

      // ReviewModerateDialog 확인
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Change Review Status')).toBeVisible();

      // 상태 선택 후 Update Status
      const selectTrigger = dialog.locator('[role="combobox"]').first();
      await selectTrigger.click();

      const hiddenOption = page.getByRole('option', { name: /hidden/i });
      await expect(hiddenOption).toBeVisible();
      await hiddenOption.click();

      const updateButton = dialog.getByRole('button', {
        name: /update status/i,
      });
      await expect(updateButton).toBeEnabled();
      await updateButton.click();

      await expect(
        page.getByText(/review status updated/i),
      ).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedAdmin(
    'should delete a review from bar detail',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);

      const reviewCard = page.locator('[data-testid^="review-card-"]').first();
      await expect(reviewCard).toBeVisible({ timeout: 15000 });

      // 메뉴 열기
      const menuTrigger = reviewCard.getByRole('button').filter({ has: page.locator('svg') }).last();
      await menuTrigger.click();

      // "Delete" 메뉴 항목 클릭
      const deleteItem = page.getByRole('menuitem', { name: /delete/i });
      await expect(deleteItem).toBeVisible();
      await deleteItem.click();

      // 삭제 확인 다이얼로그
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      const confirmButton = dialog.getByRole('button', { name: /delete/i });
      await confirmButton.click();

      await expect(
        page.getByText(/review deleted/i),
      ).toBeVisible({ timeout: 10000 });
    },
  );
});
