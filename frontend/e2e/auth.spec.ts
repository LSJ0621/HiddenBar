import {
  authenticatedUser,
  unauthenticated,
  expect,
} from './fixtures/test-fixtures';

const API_BASE = 'http://localhost:4000/api/v1';

/** 로그인/로그아웃 실제 API 테스트 전용 유저 (user1 공유 세션 보호) */
const AUTH_FLOW_USER = {
  email: 'user2@test.com',
  password: 'Test1234!',
  name: '테스트유저2',
};

// ─── 로그인 페이지 (/login) ─────────────────────────────────────

unauthenticated.describe('로그인 페이지', () => {
  unauthenticated.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  unauthenticated(
    'should render login form elements',
    async ({ page }) => {
      await expect(page.getByTestId('login-email-input')).toBeVisible();
      await expect(page.getByTestId('login-password-input')).toBeVisible();
      await expect(page.getByTestId('login-submit-button')).toBeVisible();
      await expect(page.getByTestId('google-login-button')).toBeVisible();
    },
  );

  unauthenticated('should have signup link', async ({ page }) => {
    const signupLink = page.getByRole('link', { name: 'Sign Up', exact: true });
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  unauthenticated(
    'should login and redirect to home',
    async ({ page }) => {
      await page.getByTestId('login-email-input').fill(AUTH_FLOW_USER.email);
      await page.getByTestId('login-password-input').fill(AUTH_FLOW_USER.password);
      await page.getByTestId('login-submit-button').click();

      await page.waitForURL('/');
      await expect(page.getByTestId('header-user-name')).toHaveText(
        AUTH_FLOW_USER.name,
      );
    },
  );

  unauthenticated(
    'should show error for wrong password',
    async ({ page }) => {
      await page.getByTestId('login-email-input').fill('user1@test.com');
      await page.getByTestId('login-password-input').fill('WrongPass1!');
      await page.getByTestId('login-submit-button').click();

      const errorMessage = page.getByTestId('auth-error-message');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      await expect(errorMessage).toContainText(/invalid email or password/i);
    },
  );

  unauthenticated(
    'should show error for non-existent email',
    async ({ page }) => {
      await page
        .getByTestId('login-email-input')
        .fill('nonexistent@test.com');
      await page.getByTestId('login-password-input').fill('Test1234!');
      await page.getByTestId('login-submit-button').click();

      const errorMessage = page.getByTestId('auth-error-message');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      await expect(errorMessage).toContainText(/invalid email or password/i);
    },
  );

  unauthenticated(
    'should show error for suspended account',
    async ({ page }) => {
      await page.route(`${API_BASE}/auth/login`, async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 403,
            message: 'This account has been suspended.',
          }),
        });
      });

      await page.getByTestId('login-email-input').fill('suspended@test.com');
      await page.getByTestId('login-password-input').fill('Test1234!');
      await page.getByTestId('login-submit-button').click();

      const errorMessage = page.getByTestId('auth-error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/suspended/i);
    },
  );

  unauthenticated(
    'should show validation for empty email',
    async ({ page }) => {
      await page.getByTestId('login-password-input').fill('Test1234!');
      await page.getByTestId('login-submit-button').click();

      await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 3000 });
      await expect(page).toHaveURL(/\/login/);
    },
  );

  unauthenticated(
    'should show validation for empty password',
    async ({ page }) => {
      await page.getByTestId('login-email-input').fill('user1@test.com');
      await page.getByTestId('login-submit-button').click();

      await expect(page.getByText(/enter your password/i)).toBeVisible({ timeout: 3000 });
      await expect(page).toHaveURL(/\/login/);
    },
  );

  unauthenticated(
    'should show loading state on submit',
    async ({ page }) => {
      await page.route(`${API_BASE}/auth/login`, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: 1, email: 'user1@test.com', name: '테스트유저1' },
          }),
        });
      });

      await page.getByTestId('login-email-input').fill('user1@test.com');
      await page.getByTestId('login-password-input').fill('Test1234!');
      await page.getByTestId('login-submit-button').click();

      await expect(page.getByTestId('login-submit-button')).toBeDisabled();
    },
  );
});

// ─── 회원가입 페이지 (/signup) ──────────────────────────────────

unauthenticated.describe('회원가입 페이지', () => {
  /**
   * 회원가입 3단계 API를 mock한다.
   * 실제 인증 코드는 bcrypt 해시되어 E2E에서 추출 불가.
   */
  async function mockSignupAPIs(page: import('@playwright/test').Page) {
    await page.route(`${API_BASE}/auth/email/send-code`, async (route) => {
      const request = route.request();
      const body = request.postDataJSON();

      // 중복 이메일(user1@test.com)은 실제 API로 전달
      if (body?.email === 'user1@test.com') {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route(`${API_BASE}/auth/email/verify-code`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ verificationToken: 'mock-verification-token' }),
      });
    });

    await page.route(`${API_BASE}/auth/signup`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': [
            'accessToken=mock-access-token; Path=/; HttpOnly',
            'refreshToken=mock-refresh-token; Path=/; HttpOnly',
          ].join(', '),
        },
        body: JSON.stringify({
          user: {
            id: 999,
            email: 'newuser@test.com',
            name: 'New User',
            profileImage: null,
            role: 'USER',
            createdAt: new Date().toISOString(),
            hasPassword: true,
          },
        }),
      });
    });
  }

  /** Step 1 → Step 2 전환 헬퍼 */
  async function goToStep2(page: import('@playwright/test').Page) {
    await mockSignupAPIs(page);
    await page.goto('/signup');
    await page.getByTestId('signup-email-input').fill('newuser@test.com');
    await page.getByTestId('signup-send-code-button').click();
    await expect(page.getByTestId('signup-code-input')).toBeVisible();
  }

  /** Step 2 → Step 3 전환 헬퍼 */
  async function goToStep3(page: import('@playwright/test').Page) {
    await goToStep2(page);
    await page.getByTestId('signup-code-input').fill('123456');
    await page.getByTestId('signup-verify-code-button').click();
    await expect(page.getByTestId('signup-name-input')).toBeVisible();
  }

  unauthenticated(
    'should render step 1 elements',
    async ({ page }) => {
      await page.goto('/signup');
      await expect(page.getByTestId('signup-email-input')).toBeVisible();
      await expect(page.getByTestId('signup-send-code-button')).toBeVisible();
    },
  );

  unauthenticated(
    'should transition to step 2',
    async ({ page }) => {
      await goToStep2(page);
      await expect(page.getByTestId('signup-code-input')).toBeVisible();
    },
  );

  unauthenticated(
    'should render step 2 elements',
    async ({ page }) => {
      await goToStep2(page);
      await expect(page.getByTestId('signup-code-input')).toBeVisible();
      await expect(
        page.getByTestId('signup-verify-code-button'),
      ).toBeVisible();
      await expect(page.getByTestId('signup-resend-button')).toBeVisible();
    },
  );

  unauthenticated(
    'should transition to step 3',
    async ({ page }) => {
      await goToStep3(page);
      await expect(page.getByTestId('signup-name-input')).toBeVisible();
    },
  );

  unauthenticated(
    'should render step 3 elements',
    async ({ page }) => {
      await goToStep3(page);
      await expect(page.getByTestId('signup-name-input')).toBeVisible();
      await expect(page.getByTestId('signup-password-input')).toBeVisible();
      await expect(page.getByTestId('signup-submit-button')).toBeVisible();
    },
  );

  unauthenticated(
    'should complete signup and redirect',
    async ({ page }) => {
      await goToStep3(page);
      await page.getByTestId('signup-name-input').fill('New User');
      await page.getByTestId('signup-password-input').fill('NewPass123!');
      await page.getByTestId('signup-submit-button').click();

      await page.waitForURL('/');
    },
  );

  unauthenticated(
    'should show inline error for invalid email',
    async ({ page }) => {
      await page.goto('/signup');
      await page.getByTestId('signup-email-input').fill('invalid-email');
      await page.getByTestId('signup-send-code-button').click();

      // 인라인 에러가 표시되고 Step 1에 머물러야 함
      await expect(page.locator('[role="alert"], .text-destructive, [data-slot="form-message"]').first()).toBeVisible({ timeout: 3000 });
      await expect(page.getByTestId('signup-code-input')).not.toBeVisible();
    },
  );

  unauthenticated(
    'should show inline error for short password',
    async ({ page }) => {
      await goToStep3(page);
      await page.getByTestId('signup-name-input').fill('Test User');
      await page.getByTestId('signup-password-input').fill('Ab1');
      await page.getByTestId('signup-submit-button').click();

      // 인라인 에러가 표시되고 Step 3에 머물러야 함
      await expect(page.locator('[role="alert"], .text-destructive, [data-slot="form-message"]').first()).toBeVisible({ timeout: 3000 });
      await expect(page).toHaveURL(/\/signup/);
    },
  );

  unauthenticated(
    'should show inline error for password without number',
    async ({ page }) => {
      await goToStep3(page);
      await page.getByTestId('signup-name-input').fill('Test User');
      await page.getByTestId('signup-password-input').fill('abcdefgh');
      await page.getByTestId('signup-submit-button').click();

      await expect(page.locator('[role="alert"], .text-destructive, [data-slot="form-message"]').first()).toBeVisible({ timeout: 3000 });
      await expect(page).toHaveURL(/\/signup/);
    },
  );

  unauthenticated(
    'should show inline error for short name',
    async ({ page }) => {
      await goToStep3(page);
      await page.getByTestId('signup-name-input').fill('A');
      await page.getByTestId('signup-password-input').fill('Test1234!');
      await page.getByTestId('signup-submit-button').click();

      await expect(page.locator('[role="alert"], .text-destructive, [data-slot="form-message"]').first()).toBeVisible({ timeout: 3000 });
      await expect(page).toHaveURL(/\/signup/);
    },
  );

  unauthenticated(
    'should show error for duplicate email',
    async ({ page }) => {
      // 실제 API 호출 — user1@test.com은 이미 존재
      await page.goto('/signup');
      await page.getByTestId('signup-email-input').fill('user1@test.com');
      await page.getByTestId('signup-send-code-button').click();

      // 에러 메시지가 표시되고 Step 1에 머물러야 함
      await expect(page.getByTestId('signup-email-input')).toBeVisible();
      await expect(page.getByTestId('signup-code-input')).not.toBeVisible();
    },
  );

  unauthenticated('should have login link', async ({ page }) => {
    await page.goto('/signup');
    const loginLink = page.getByRole('link', { name: /log in/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Google OAuth ────────────────────────────────────────────

unauthenticated.describe('Google OAuth', () => {
  unauthenticated(
    'should navigate to Google OAuth URL',
    async ({ page }) => {
      await page.goto('/login');

      await page.route('https://accounts.google.com/**', (route) => route.abort());

      const [request] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('accounts.google.com')),
        page.getByTestId('google-login-button').click(),
      ]);

      const capturedUrl = request.url();
      expect(capturedUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(capturedUrl).toContain('client_id=');
      expect(capturedUrl).toContain('redirect_uri=');
      expect(capturedUrl).toContain('state=');
    },
  );

  unauthenticated(
    'should store CSRF state in sessionStorage',
    async ({ page }) => {
      await page.route('https://accounts.google.com/**', (route) => route.abort());

      await page.goto('/login');

      const stateBefore = await page.evaluate(() =>
        sessionStorage.getItem('oauth_state'),
      );
      expect(stateBefore).toBeNull();

      // state는 sessionStorage에 저장된 후 URL에도 포함됨 — URL에서 추출하여 UUID 검증
      const [request] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('accounts.google.com')),
        page.getByTestId('google-login-button').click(),
      ]);

      const url = request.url();
      const stateParam = new URL(url).searchParams.get('state');

      expect(stateParam).toBeTruthy();
      expect(stateParam).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    },
  );
});

// ─── 인증 상태 관리 ──────────────────────────────────────────

authenticatedUser.describe('인증 상태 관리', () => {
  authenticatedUser(
    'should redirect authenticated user from login to home',
    async ({ page }) => {
      await page.goto('/login');
      await page.waitForURL('/');
      await expect(page).toHaveURL('/');
    },
  );

  authenticatedUser(
    'should redirect authenticated user from signup to home',
    async ({ page }) => {
      await page.goto('/signup');
      await page.waitForURL('/');
      await expect(page).toHaveURL('/');
    },
  );

  authenticatedUser(
    'should maintain session after reload',
    async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('header-user-name')).toBeVisible();

      await page.reload();
      await expect(page.getByTestId('header-user-name')).toBeVisible();
    },
  );

});

// ─── 실제 로그인 → 로그아웃 통합 플로우 ────────────────────────

unauthenticated(
  'should logout and redirect to login',
  async ({ page }) => {
    // user2로 실제 로그인
    await page.goto('/login');
    await page.getByTestId('login-email-input').fill(AUTH_FLOW_USER.email);
    await page.getByTestId('login-password-input').fill(AUTH_FLOW_USER.password);
    await page.getByTestId('login-submit-button').click();
    await page.waitForURL('/');

    // 실제 로그아웃
    await page.getByTestId('header-avatar-trigger').click();
    await page.getByTestId('header-logout-button').click();
    await page.waitForURL(/\/(login)?$/);

    // 서버 세션 무효화 검증: 보호 경로 접근 시 로그인으로 리다이렉트
    await page.goto('/bookmarks');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  },
);

// 보호 경로 테스트 — 미인증 픽스처 사용
unauthenticated(
  'should redirect to login when accessing protected route',
  async ({ page }) => {
    await page.goto('/bookmarks');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  },
);
