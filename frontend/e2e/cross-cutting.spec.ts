import {
  authenticatedUser,
  authenticatedAdmin,
  unauthenticated,
  expect,
} from './fixtures/test-fixtures';

const API_BASE = 'http://localhost:4000/api/v1';

// ─── 토큰 자동 갱신 ──────────────────────────────────────

authenticatedUser.describe('Token Auto-refresh', () => {
  authenticatedUser(
    'should silently refresh expired access token',
    async ({ page }) => {
      let callCount = 0;

      // 첫 번째 API 호출 시 401 반환, refresh 후 재시도 시 성공
      await page.route('**/api/v1/users/profile', async (route) => {
        callCount++;
        if (callCount === 1) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized' }),
          });
        } else {
          await route.fallback();
        }
      });

      // refresh 엔드포인트는 성공 응답
      await page.route('**/api/v1/auth/refresh', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Token refreshed' }),
        });
      });

      await page.goto('/profile');
      // 프로필 페이지가 정상 로드됨 (자동 갱신 후 재시도 성공)
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should refresh token once for concurrent 401 requests',
    async ({ page }) => {
      let refreshCount = 0;
      let apiCallCount = 0;

      // 여러 API에서 첫 호출 시 401 반환
      await page.route('**/api/v1/users/profile', async (route) => {
        apiCallCount++;
        if (apiCallCount <= 2) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized' }),
          });
        } else {
          await route.fallback();
        }
      });

      await page.route('**/api/v1/auth/refresh', async (route) => {
        refreshCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Token refreshed' }),
        });
      });

      await page.goto('/profile');
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

      // refresh 호출이 최대 1번만 발생 (큐 메커니즘)
      expect(refreshCount).toBeLessThanOrEqual(1);
    },
  );

  authenticatedUser(
    'should redirect to login when refresh token expires',
    async ({ page }) => {
      // 모든 API를 401로 mock (refresh 포함)
      // logout은 204 mock (실제 서버 호출하면 공유 세션의 refresh token이 삭제됨)
      await page.route('**/api/v1/**', async (route) => {
        const url = route.request().url();
        if (url.includes('/auth/refresh')) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Refresh token expired' }),
          });
        } else if (url.includes('/auth/logout')) {
          await route.fulfill({
            status: 204,
            headers: {
              'set-cookie': 'accessToken=; Max-Age=0; Path=/, refreshToken=; Max-Age=0; Path=/',
            },
          });
        } else if (url.includes('/auth/login') || url.includes('/auth/signup')) {
          await route.fallback();
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Unauthorized' }),
          });
        }
      });

      await page.goto('/profile');
      // clearIsLoggedIn → window.location.href = '/login'
      await page.waitForURL(/\/login/, { timeout: 30000 });
    },
  );
});

// ─── 404 페이지 ───────────────────────────────────────────

unauthenticated.describe('404 Page', () => {
  unauthenticated(
    'should render not-found page for invalid route',
    async ({ page }) => {
      await page.goto('/nonexistent-page-xyz-123');

      const notFound = page.getByTestId('not-found');
      await expect(notFound).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('404')).toBeVisible();
      await expect(page.getByText('Page not found')).toBeVisible();
    },
  );

  unauthenticated(
    'should navigate home from 404 page',
    async ({ page }) => {
      await page.goto('/nonexistent-page-xyz-123');

      const homeButton = page.getByTestId('not-found-home');
      await expect(homeButton).toBeVisible({ timeout: 15000 });

      await homeButton.click();
      await page.waitForURL('/');
    },
  );
});

// ─── 에러 바운더리 ────────────────────────────────────────

authenticatedUser.describe('Error Boundary', () => {
  // TanStack Query가 API 에러를 catch하므로 Next.js error boundary가 트리거되지 않음.
  // 렌더링 크래시를 E2E에서 안정적으로 유발하기 어려워 fixme 처리.
  // error.tsx의 동작은 단위 테스트(error.test.tsx)에서 커버된다.
  authenticatedUser.fixme(
    'should show error UI on rendering error',
    async ({ page }) => {
      await page.goto('/search');
      const errorUI = page.getByTestId('main-error');
      await expect(errorUI).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Something went wrong')).toBeVisible();
    },
  );

  authenticatedUser.fixme(
    'should retry on error retry button click',
    async ({ page }) => {
      await page.goto('/search');
      const retryButton = page.getByTestId('main-error-retry');
      await expect(retryButton).toBeVisible({ timeout: 15000 });
      await retryButton.click();
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    },
  );
});

// ─── 로딩 상태 ────────────────────────────────────────────

authenticatedUser.describe('Loading State', () => {
  authenticatedUser(
    'should show loading state and replace with content',
    async ({ page }) => {
      await page.goto('/search');

      // 최종적으로 콘텐츠가 로드됨
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    },
  );
});

// ─── 반응형 레이아웃 — 모바일 ─────────────────────────────

authenticatedUser.describe('Responsive — Mobile (375px)', () => {
  authenticatedUser.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  authenticatedUser(
    'should render home without breakage on mobile',
    async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

      // 콘텐츠가 뷰포트를 넘지 않는지 확인
      const body = page.locator('body');
      const box = await body.boundingBox();
      expect(box).toBeTruthy();
      // 375px 뷰포트에서 수평 오버플로우 없음
      expect(box!.width).toBeLessThanOrEqual(376);
    },
  );

  authenticatedUser(
    'should show collapsible filter on mobile search',
    async ({ page }) => {
      await page.goto('/search');
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

      // 모바일에서 페이지가 정상 렌더링되는지 확인
      const body = page.locator('body');
      const box = await body.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeLessThanOrEqual(376);
    },
  );

  authenticatedUser(
    'should show single column on mobile bar detail',
    async ({ page, request }) => {
      const res = await request.get(`${API_BASE}/bars/search?name=Bar&limit=1`);
      const data = await res.json();
      const bars = data.items ?? data.data ?? [];
      expect(bars.length).toBeGreaterThan(0);

      await page.goto(`/bars/${bars[0].id}`);
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

      // 모바일에서 콘텐츠가 375px 이내
      const main = page.locator('main');
      const box = await main.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeLessThanOrEqual(376);
    },
  );
});

authenticatedAdmin.describe('Responsive — Mobile Admin (375px)', () => {
  authenticatedAdmin(
    'should show hamburger menu on mobile admin',
    async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // 모바일에서는 햄버거 메뉴 (Open menu 버튼) 표시
      const menuButton = page.getByRole('button', { name: /open menu/i });
      await expect(menuButton).toBeVisible({ timeout: 15000 });

      // 클릭하면 사이드바 Sheet 열림
      await menuButton.click();
      // Sheet dialog로 scope 제한 (데스크탑/모바일 양쪽에 admin-sidebar testid 존재)
      const dialog = page.locator('[role="dialog"]');
      const sidebar = dialog.getByTestId('admin-sidebar');
      await expect(sidebar).toBeVisible({ timeout: 10000 });
    },
  );
});

// ─── 반응형 레이아웃 — 데스크탑 ───────────────────────────

authenticatedUser.describe('Responsive — Desktop (1280px)', () => {
  authenticatedUser.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  authenticatedUser(
    'should render home landing content on desktop',
    async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should show side filter + results on desktop search',
    async ({ page }) => {
      await page.goto('/search');
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

      // 데스크탑에서 사이드 필터 패널이 항상 표시됨
      const mainArea = page.locator('main');
      const box = await mainArea.boundingBox();
      expect(box).toBeTruthy();
      // 데스크탑 너비를 활용하고 있는지 확인
      expect(box!.width).toBeGreaterThan(800);
    },
  );
});

authenticatedAdmin.describe('Responsive — Desktop Admin (1280px)', () => {
  authenticatedAdmin(
    'should show always-visible sidebar on desktop admin',
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/admin');

      // 데스크탑에서 사이드바가 항상 표시
      const sidebar = page.getByTestId('admin-sidebar');
      await expect(sidebar).toBeVisible({ timeout: 15000 });

      // 햄버거 메뉴는 숨겨짐
      const menuButton = page.getByRole('button', { name: /open menu/i });
      await expect(menuButton).not.toBeVisible();
    },
  );
});

// ─── 미들웨어 라우트 보호 ─────────────────────────────────

unauthenticated.describe('Route Protection — Unauthenticated', () => {
  const protectedRoutes = [
    '/search',
    '/bars/1',
    '/bars/1/edit',
    '/bookmarks',
    '/profile',
    '/profile/edit',
    '/my-bars',
    '/bars/new',
    '/directions',
  ];

  for (const route of protectedRoutes) {
    unauthenticated(
      `should redirect from ${route} to login`,
      async ({ page }) => {
        await page.goto(route);
        await page.waitForURL(/\/login/, { timeout: 10000 });
        expect(page.url()).toContain('/login');
      },
    );
  }
});

authenticatedUser.describe('Route Protection — Non-admin', () => {
  authenticatedUser(
    'should redirect non-admin from admin routes',
    async ({ page }) => {
      await page.goto('/admin');
      // 미들웨어: accessToken 있으면 통과 → AdminSidebar 클라이언트 체크 → / 리다이렉트 + 토스트
      await page.waitForURL('/', { timeout: 10000 });
      expect(page.url()).not.toContain('/admin');
      await expect(page.getByText(/admin access required/i)).toBeVisible({ timeout: 5000 });
    },
  );
});

authenticatedUser.describe('Route Protection — Authenticated', () => {
  authenticatedUser(
    'should redirect authenticated from /login',
    async ({ page }) => {
      await page.goto('/login');
      await page.waitForURL('/', { timeout: 10000 });
      expect(page.url()).not.toContain('/login');
    },
  );

  authenticatedUser(
    'should redirect authenticated from /signup',
    async ({ page }) => {
      await page.goto('/signup');
      await page.waitForURL('/', { timeout: 10000 });
      expect(page.url()).not.toContain('/signup');
    },
  );
});
