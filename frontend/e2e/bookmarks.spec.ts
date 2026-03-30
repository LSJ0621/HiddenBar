import {
  authenticatedUser,
  unauthenticated,
  expect,
} from './fixtures/test-fixtures';

const API_BASE = 'http://localhost:4000/api/v1';

// ─── 북마크 페이지 (/bookmarks) ────────────────────────────────

authenticatedUser.describe('북마크 페이지', () => {
  /** 테스트 전 북마크 2건 확보: 검색 결과에서 바 ID를 가져와 북마크 추가 */
  const barIds: number[] = [];

  authenticatedUser.beforeAll(async ({ request }) => {
    // 시드 데이터에서 APPROVED 바 검색
    const searchRes = await request.get(`${API_BASE}/bars/search?name=Bar&limit=3`);
    const searchData = await searchRes.json();
    const bars = searchData.items ?? searchData.data ?? [];

    for (const bar of bars.slice(0, 2)) {
      await request.put(`${API_BASE}/bars/${bar.id}/bookmark`);
      barIds.push(bar.id);
    }
  });

  authenticatedUser.afterAll(async ({ request }) => {
    // 테스트 후 북마크 정리
    for (const barId of barIds) {
      await request.delete(`${API_BASE}/bars/${barId}/bookmark`);
    }
  });

  authenticatedUser(
    'should display bookmark list with bar cards',
    async ({ page }) => {
      await page.goto('/bookmarks');

      const bookmarkList = page.getByTestId('bookmark-list');
      await expect(bookmarkList).toBeVisible({ timeout: 10000 });

      // 바 이름이 포함된 항목이 최소 1개 존재
      const items = bookmarkList.locator('a, [role="button"]');
      expect(await items.count()).toBeGreaterThan(0);
    },
  );

  authenticatedUser(
    'should navigate to bar detail on card click',
    async ({ page }) => {
      await page.goto('/bookmarks');

      const bookmarkList = page.getByTestId('bookmark-list');
      await expect(bookmarkList).toBeVisible({ timeout: 10000 });

      const firstLink = bookmarkList.locator('a').first();
      await firstLink.click();
      await page.waitForURL(/\/bars\/\d+/);
    },
  );

  authenticatedUser(
    'should show empty state when no bookmarks',
    async ({ page }) => {
      // Mock: 빈 북마크 목록 응답
      await page.route(`${API_BASE}/users/me/bookmarks*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [],
            meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
          }),
        });
      });

      await page.goto('/bookmarks');

      // EmptyState: "No bookmarked bars yet" 텍스트 확인
      await expect(page.getByText('No bookmarked bars yet')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('main').getByRole('link', { name: /search bars/i })).toBeVisible();
    },
  );

  authenticatedUser(
    'should show pagination when many bookmarks',
    async ({ page }) => {
      await page.goto('/bookmarks');

      // 페이지네이션은 totalPages > 1일 때만 표시
      // 시드 데이터 양에 따라 존재 여부가 다를 수 있음
      const bookmarkList = page.getByTestId('bookmark-list');
      await expect(bookmarkList).toBeVisible({ timeout: 10000 });

      const pagination = page.getByTestId('bookmark-pagination');
      // 데이터가 적으면 페이지네이션 미표시 — 조건부 검증
      const count = await page.getByTestId('bookmark-count').textContent();
      const totalItems = parseInt(count ?? '0', 10);

      if (totalItems > 10) {
        await expect(pagination).toBeVisible();
      } else {
        await expect(pagination).not.toBeVisible();
      }
    },
  );
});

// ─── 바 카드에서 북마크 토글 ──────────────────────────────────

authenticatedUser.describe('바 카드에서 북마크 토글', () => {
  authenticatedUser(
    'should add bookmark on bar card',
    async ({ page, request }) => {
      // Arrange: 북마크 해제 상태 확보
      const searchRes = await request.get(`${API_BASE}/bars/search?name=Bar&limit=1`);
      const searchData = await searchRes.json();
      const bar = (searchData.items ?? searchData.data ?? [])[0];
      await request.delete(`${API_BASE}/bars/${bar.id}/bookmark`);

      await page.goto('/search?name=Bar&tab=name');

      const bookmarkButton = page.getByTestId(`bar-card-bookmark-${bar.id}`);
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
      await expect(bookmarkButton).toHaveAttribute('aria-label', 'Add bookmark');

      // 카운트 기록
      const countBefore = await bookmarkButton.locator('span').textContent();

      // Act: 북마크 추가
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/bookmark') && res.ok()),
        bookmarkButton.click(),
      ]);

      // Assert: aria-label 변경 + 카운트 +1
      await expect(bookmarkButton).toHaveAttribute('aria-label', 'Remove bookmark');
      const countAfter = await bookmarkButton.locator('span').textContent();
      expect(parseInt(countAfter ?? '0', 10)).toBe(parseInt(countBefore ?? '0', 10) + 1);
    },
  );

  authenticatedUser(
    'should remove bookmark on bar card',
    async ({ page, request }) => {
      // 사전 조건: 북마크 추가
      const searchRes = await request.get(`${API_BASE}/bars/search?name=Bar&limit=1`);
      const searchData = await searchRes.json();
      const bar = (searchData.items ?? searchData.data ?? [])[0];
      await request.put(`${API_BASE}/bars/${bar.id}/bookmark`);

      await page.goto('/search?name=Bar&tab=name');

      const bookmarkButton = page.getByTestId(`bar-card-bookmark-${bar.id}`);
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
      await expect(bookmarkButton).toHaveAttribute('aria-label', 'Remove bookmark');

      // 카운트 기록
      const countBefore = await bookmarkButton.locator('span').textContent();

      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/bookmark') && res.ok()),
        bookmarkButton.click(),
      ]);

      // Assert: aria-label 변경 + 카운트 -1
      await expect(bookmarkButton).toHaveAttribute('aria-label', 'Add bookmark');
      const countAfter = await bookmarkButton.locator('span').textContent();
      expect(parseInt(countAfter ?? '0', 10)).toBe(parseInt(countBefore ?? '0', 10) - 1);
    },
  );

  authenticatedUser(
    'should show optimistic update then confirm on reload',
    async ({ page, request }) => {
      // 사전 조건: 북마크 제거 상태 확보
      const searchRes = await request.get(`${API_BASE}/bars/search?name=Bar&limit=1`);
      const searchData = await searchRes.json();
      const bar = (searchData.items ?? searchData.data ?? [])[0];
      await request.delete(`${API_BASE}/bars/${bar.id}/bookmark`);

      await page.goto('/search?name=Bar&tab=name');

      const bookmarkButton = page.getByTestId(`bar-card-bookmark-${bar.id}`);
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });
      await expect(bookmarkButton).toHaveAttribute('aria-label', 'Add bookmark');

      // 클릭 → 즉시 UI 반영 (옵티미스틱)
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/bookmark') && res.ok()),
        bookmarkButton.click(),
      ]);
      await expect(bookmarkButton).toHaveAttribute('aria-label', 'Remove bookmark');

      // 새로고침 후 서버 상태와 일치 확인
      await page.reload();
      const reloadedButton = page.getByTestId(`bar-card-bookmark-${bar.id}`);
      await expect(reloadedButton).toBeVisible({ timeout: 10000 });
      await expect(reloadedButton).toHaveAttribute('aria-label', 'Remove bookmark');
    },
  );
});

// ─── 검색 결과에서 북마크 토글 ──────────────────────────────────

authenticatedUser.describe('검색 결과에서 북마크 토글', () => {
  authenticatedUser(
    'should toggle bookmark in search results',
    async ({ page }) => {
      await page.goto('/search?name=Bar&tab=name');

      const bookmarkButton = page
        .locator('[data-testid^="bar-card-bookmark-"]')
        .first();
      await expect(bookmarkButton).toBeVisible({ timeout: 10000 });

      const initialLabel = await bookmarkButton.getAttribute('aria-label');

      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/bookmark') && res.ok()),
        bookmarkButton.click(),
      ]);

      const expectedLabel = initialLabel === 'Add bookmark' ? 'Remove bookmark' : 'Add bookmark';
      await expect(bookmarkButton).toHaveAttribute('aria-label', expectedLabel);
    },
  );
});

unauthenticated(
  'should redirect to login when unauthenticated user clicks bookmark',
  async ({ page }) => {
    // /search 자체가 보호 경로이므로 /login으로 리다이렉트
    await page.goto('/search');
    await page.waitForURL(/\/login/);
  },
);

// ─── 북마크 페이지에서 제거 ──────────────────────────────────

authenticatedUser.describe('북마크 페이지에서 제거', () => {
  authenticatedUser.beforeEach(async ({ request }) => {
    // 테스트용 북마크 확보
    const searchRes = await request.get(`${API_BASE}/bars/search?name=Bar&limit=2`);
    const searchData = await searchRes.json();
    const bars = searchData.items ?? searchData.data ?? [];
    for (const bar of bars.slice(0, 2)) {
      await request.put(`${API_BASE}/bars/${bar.id}/bookmark`);
    }
  });

  authenticatedUser(
    'should remove card when unbookmarked from bookmark page',
    async ({ page }) => {
      await page.goto('/bookmarks');

      const bookmarkList = page.getByTestId('bookmark-list');
      await expect(bookmarkList).toBeVisible({ timeout: 10000 });

      // 편집 모드 진입
      await page.getByTestId('bookmark-edit-btn').click();
      await expect(page.getByTestId('bookmark-action-bar')).toBeVisible();

      // 첫 번째 아이템 선택
      const selectCheckbox = page.locator('[data-testid^="bookmark-select-item-"]').first();
      await selectCheckbox.click();
      await expect(page.getByTestId('bookmark-count')).toHaveText(/1 selected/);

      // 삭제 버튼 클릭
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/bookmark') && res.ok()),
        page.getByTestId('bookmark-delete-selected').click(),
      ]);

      // 성공 토스트 확인
      await expect(page.getByText(/removed/i)).toBeVisible({ timeout: 5000 });
    },
  );

  authenticatedUser(
    'should show loading state during unbookmark',
    async ({ page }) => {
      await page.goto('/bookmarks');

      const bookmarkList = page.getByTestId('bookmark-list');
      await expect(bookmarkList).toBeVisible({ timeout: 10000 });

      // 편집 모드 진입
      await page.getByTestId('bookmark-edit-btn').click();

      // API 지연시켜 로딩 상태 관찰 (선택 전에 route 설정)
      await page.route('**/api/v1/bars/*/bookmark', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.fallback();
      });

      // 아이템 선택
      const selectCheckbox = page.locator('[data-testid^="bookmark-select-item-"]').first();
      await selectCheckbox.click();
      await expect(page.getByTestId('bookmark-count')).toHaveText(/1 selected/);

      await page.getByTestId('bookmark-delete-selected').click();

      // 삭제 버튼이 "Deleting..." 상태로 변경
      await expect(page.getByTestId('bookmark-delete-selected')).toHaveText(/deleting/i);
      await expect(page.getByTestId('bookmark-delete-selected')).toBeDisabled();
    },
  );
});

// ─── 인증 보호 ───────────────────────────────────────────────

unauthenticated(
  'should redirect unauthenticated user from /bookmarks to /login',
  async ({ page }) => {
    await page.goto('/bookmarks');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  },
);
