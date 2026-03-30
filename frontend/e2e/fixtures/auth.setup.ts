import { test as setup, type APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:4000/api/v1';

const TEST_USER = {
  email: 'user1@test.com',
  password: 'Test1234!',
};

/**
 * AdminInitService와 동일한 환경변수에서 관리자 크레덴셜을 가져온다.
 * 미설정 시 명확한 에러를 던진다.
 */
function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set. '
        + 'These must match the values used by AdminInitService.',
    );
  }
  return { email, password };
}

/**
 * 사전 생성된 계정으로 로그인한 뒤, 쿠키 기반 storageState를 저장한다.
 * 계정은 백엔드 init 서비스(AdminInitService, SeedInitService)가 서버 시작 시 생성한다.
 */
async function loginAndSaveState(
  request: APIRequestContext,
  credentials: { email: string; password: string },
  storagePath: string,
) {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: credentials,
  });

  if (!res.ok()) {
    throw new Error(
      `Login failed for ${credentials.email}: ${res.status()} ${await res.text()}`,
    );
  }

  await request.storageState({ path: storagePath });
}

setup('authenticate as user', async ({ request }) => {
  await loginAndSaveState(request, TEST_USER, 'e2e/.auth/user.json');
});

setup('authenticate as admin', async ({ request }) => {
  await loginAndSaveState(request, getAdminCredentials(), 'e2e/.auth/admin.json');
});
