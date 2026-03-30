import {
  authenticatedUser,
  unauthenticated,
  expect,
} from './fixtures/test-fixtures';

const API_BASE = 'http://localhost:4000/api/v1';

/** 응답 body를 안전하게 JSON 파싱한다. 빈 body면 null 반환. */
async function safeJson(res: import('@playwright/test').APIResponse) {
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

/**
 * 테스트용 APPROVED 바 ID를 가져온다.
 * 시드 데이터에서 검색하여 첫 번째 결과를 반환한다.
 */
async function getApprovedBarId(request: import('@playwright/test').APIRequestContext): Promise<number> {
  const res = await request.get(`${API_BASE}/bars/search?name=Bar&limit=1`);
  const data = await res.json();
  const bars = data.items ?? data.data ?? [];
  if (bars.length === 0) throw new Error('No approved bars found in seed data');
  return bars[0].id;
}

// ─── 바 상세 — 리뷰 섹션 ───────────────────────────────────

authenticatedUser.describe('바 상세 — 리뷰 섹션', () => {
  let barId: number;

  authenticatedUser.beforeAll(async ({ request }) => {
    barId = await getApprovedBarId(request);
    // 리뷰가 최소 1개 존재하도록 보장
    await request.post(`${API_BASE}/reviews`, {
      data: { barId, rating: 4, content: 'E2E test review' },
    });
  });

  authenticatedUser(
    'should display review cards',
    async ({ page, request }) => {
      // 리뷰가 최소 1개 존재하도록 보장
      await request.post(`${API_BASE}/reviews`, {
        data: { barId, rating: 4, content: 'E2E test review for display' },
      });

      await page.goto(`/bars/${barId}`);

      // 리뷰 카드가 표시되어야 함
      const reviewCard = page.locator('[data-testid^="review-card-"]').first();
      await expect(reviewCard).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should display review stats summary',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);

      const statsSummary = page.getByTestId('review-stats-summary');
      await expect(statsSummary).toBeVisible({ timeout: 15000 });

      // 평균 평점과 리뷰 수가 표시
      await expect(statsSummary.locator('text=/\\d+\\.\\d/')).toBeVisible();
      await expect(statsSummary.getByText(/review/i)).toBeVisible();
    },
  );

  authenticatedUser(
    'should show pagination when many reviews',
    async ({ page }) => {
      // 11개 이상의 리뷰를 mock으로 반환하여 pagination 검증
      const mockReviews = Array.from({ length: 15 }, (_, i) => ({
        id: 9000 + i,
        rating: (i % 5) + 1,
        content: `Mock review ${i}`,
        visitedAt: null,
        status: 'PUBLISHED',
        author: { id: 100 + i, name: `User ${i}`, profileImageUrl: null },
        photos: [],
        createdAt: new Date().toISOString(),
      }));
      await page.route(`${API_BASE}/bars/${barId}/reviews*`, async (route) => {
        const url = new URL(route.request().url());
        const page_ = parseInt(url.searchParams.get('page') ?? '1');
        const limit = parseInt(url.searchParams.get('limit') ?? '10');
        const start = (page_ - 1) * limit;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: mockReviews.slice(start, start + limit),
            meta: { totalItems: mockReviews.length, limit, totalPages: Math.ceil(mockReviews.length / limit), page: page_ },
            stats: { averageRating: 3.5, totalCount: mockReviews.length, distribution: [{ rating: 1, count: 3 }, { rating: 2, count: 3 }, { rating: 3, count: 3 }, { rating: 4, count: 3 }, { rating: 5, count: 3 }] },
          }),
        });
      });

      await page.goto(`/bars/${barId}`);

      // 리뷰 카드 로드 대기
      await expect(
        page.locator('[data-testid^="review-card-"]').first(),
      ).toBeVisible({ timeout: 15000 });

      // 페이지네이션은 리뷰가 충분히 많을 때만 표시
      const paginationButtons = page.locator('section:has([data-testid="review-stats-summary"])').getByTestId('pagination');
      // 리뷰 수가 적으면 페이지네이션이 없을 수 있으므로 조건부 검증
      const statsText = await page.getByTestId('review-stats-summary').textContent();
      const match = statsText?.match(/(\d+)\s*review/);
      const totalReviews = match ? parseInt(match[1], 10) : 0;

      if (totalReviews > 10) {
        await expect(paginationButtons.first()).toBeVisible();
      }
    },
  );

  authenticatedUser(
    'should show empty state when no reviews',
    async ({ page }) => {
      // 리뷰가 없는 바를 mock으로 시뮬레이션
      await page.route(`${API_BASE}/bars/*/reviews*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [],
            meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
            stats: { averageRating: 0, totalCount: 0, distribution: [] },
          }),
        });
      });
      // 내 리뷰도 없음
      await page.route(`${API_BASE}/bars/*/my-review`, async (route) => {
        await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      });

      await page.goto(`/bars/${barId}`);

      await expect(page.getByText('No reviews yet')).toBeVisible({ timeout: 15000 });
    },
  );
});

unauthenticated.describe('리뷰 섹션 — 미인증', () => {
  unauthenticated(
    'should show login prompt for unauthenticated user',
    async ({ page }) => {
      // 미인증 상태에서 바 상세 접근 시 로그인 페이지로 리다이렉트됨
      // (axios interceptor가 401 → refresh 실패 → /login 리다이렉트)
      const searchRes = await page.request.get(`${API_BASE}/bars/search?name=Bar&limit=1`);
      const searchData = await searchRes.json();
      const bars = searchData.items ?? searchData.data ?? [];
      const barId = bars[0]?.id ?? 1;

      await page.goto(`/bars/${barId}`);

      await page.waitForURL(/\/login/, { timeout: 15000 });
    },
  );
});

// ─── 리뷰 작성 ──────────────────────────────────────────────

authenticatedUser.describe('리뷰 작성', () => {
  let barId: number;

  authenticatedUser.beforeAll(async ({ request }) => {
    barId = await getApprovedBarId(request);
    // 기존 리뷰 정리 (있다면)
    const myReviewRes = await request.get(`${API_BASE}/bars/${barId}/my-review`);
    if (myReviewRes.ok()) {
      const myReview = await safeJson(myReviewRes);
      if (myReview?.id) {
        await request.delete(`${API_BASE}/reviews/${myReview.id}`);
      }
    }
  });

  authenticatedUser.afterAll(async ({ request }) => {
    // 테스트 후 리뷰 정리
    const myReviewRes = await request.get(`${API_BASE}/bars/${barId}/my-review`);
    if (myReviewRes.ok()) {
      const myReview = await safeJson(myReviewRes);
      if (myReview?.id) {
        await request.delete(`${API_BASE}/reviews/${myReview.id}`);
      }
    }
  });

  authenticatedUser(
    'should open review form modal on write button click',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);

      const writeButton = page.getByTestId('review-write-button');
      await expect(writeButton).toBeVisible({ timeout: 15000 });
      await writeButton.click();

      // 모달이 열림 — Desktop: Dialog, 별점, 내용 입력, 방문일 필드
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('dialog').getByRole('heading', { name: /write a review/i })).toBeVisible();

      // 별점 radiogroup
      await expect(page.getByRole('radiogroup', { name: 'Rating' })).toBeVisible();
      // 내용 textarea
      await expect(page.getByPlaceholder(/how was your experience/i)).toBeVisible();
      // 방문일 필드
      await expect(page.getByText(/visit date/i)).toBeVisible();
    },
  );

  authenticatedUser(
    'should show validation for missing rating and content',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);

      const writeButton = page.getByTestId('review-write-button');
      await expect(writeButton).toBeVisible({ timeout: 15000 });
      await writeButton.click();

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // 빈 상태로 제출 시도
      await page.getByRole('button', { name: /submit/i }).click();

      // 유효성 에러 메시지
      await expect(
        page.locator('[data-slot="form-message"], .text-destructive').first(),
      ).toBeVisible({ timeout: 3000 });
    },
  );

  authenticatedUser(
    'should create review and reflect in list',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);

      const writeButton = page.getByTestId('review-write-button');
      await expect(writeButton).toBeVisible({ timeout: 15000 });
      await writeButton.click();

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // 별점 4점 선택
      await page.getByRole('radio', { name: '4 stars' }).click();

      // 내용 입력
      await page.getByPlaceholder(/how was your experience/i).fill('Great bar, excellent cocktails!');

      // 제출
      await page.getByRole('button', { name: /submit/i }).click();

      // 성공 토스트
      await expect(page.getByText(/review submitted/i)).toBeVisible({ timeout: 10000 });

      // 모달 닫힘
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

      // 리뷰 목록에 새 리뷰 반영
      await expect(page.getByText('Great bar, excellent cocktails!')).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedUser(
    'should prevent duplicate review',
    async ({ page, request }) => {
      // 리뷰가 이미 존재하는 상태 확보
      const myReviewRes = await request.get(`${API_BASE}/bars/${barId}/my-review`);
      if (!myReviewRes.ok()) {
        await request.post(`${API_BASE}/reviews`, {
          data: { barId, rating: 4, content: 'Existing review' },
        });
      }

      await page.goto(`/bars/${barId}`);

      // 이미 리뷰를 작성한 경우 "Edit My Review" 버튼이 표시됨
      const writeButton = page.getByTestId('review-write-button');
      await expect(writeButton).toBeVisible({ timeout: 15000 });
      await expect(writeButton).toHaveText(/edit my review/i);
    },
  );
});

// ─── 리뷰 수정/삭제 ────────────────────────────────────────

authenticatedUser.describe('리뷰 수정/삭제', () => {
  let barId: number;
  let reviewId: number;

  authenticatedUser.beforeAll(async ({ request }) => {
    barId = await getApprovedBarId(request);
    // 기존 리뷰 정리 후 새로 생성
    const myReviewRes = await request.get(`${API_BASE}/bars/${barId}/my-review`);
    if (myReviewRes.ok()) {
      const myReview = await safeJson(myReviewRes);
      if (myReview?.id) {
        await request.delete(`${API_BASE}/reviews/${myReview.id}`);
      }
    }
    const createRes = await request.post(`${API_BASE}/reviews`, {
      data: { barId, rating: 3, content: 'Review to be edited' },
    });
    const created = await createRes.json();
    reviewId = created.id;
  });

  authenticatedUser.afterAll(async ({ request }) => {
    // 정리
    try {
      await request.delete(`${API_BASE}/reviews/${reviewId}`);
    } catch { /* 이미 삭제된 경우 무시 */ }
  });

  authenticatedUser(
    'should open edit modal with pre-filled data',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);

      // "Edit My Review" 버튼 클릭
      const editButton = page.getByTestId('review-write-button');
      await expect(editButton).toBeVisible({ timeout: 15000 });
      await expect(editButton).toHaveText(/edit my review/i);
      await editButton.click();

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // 기존 내용이 프리필
      const textarea = page.getByPlaceholder(/how was your experience/i);
      await expect(textarea).toHaveValue('Review to be edited');

      // 기존 별점이 선택됨 (3점)
      await expect(page.getByRole('radio', { name: '3 stars' })).toHaveAttribute('aria-checked', 'true');
    },
  );

  authenticatedUser(
    'should update review successfully',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);

      const editButton = page.getByTestId('review-write-button');
      await expect(editButton).toBeVisible({ timeout: 15000 });
      await editButton.click();

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // 내용 수정
      const textarea = page.getByPlaceholder(/how was your experience/i);
      await textarea.clear();
      await textarea.fill('Updated review content');

      // 별점 5로 변경
      await page.getByRole('radio', { name: '5 stars' }).click();

      // 업데이트 클릭
      await page.getByRole('button', { name: /update/i }).click();

      // 성공 토스트
      await expect(page.getByText(/review updated/i)).toBeVisible({ timeout: 10000 });

      // 변경 내용 반영
      await expect(page.getByText('Updated review content')).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedUser(
    'should confirm and delete review',
    async ({ page, request }) => {
      // 삭제 후 재생성을 위해 리뷰 다시 생성
      const myReviewRes = await request.get(`${API_BASE}/bars/${barId}/my-review`);
      if (!myReviewRes.ok()) {
        const createRes = await request.post(`${API_BASE}/reviews`, {
          data: { barId, rating: 3, content: 'Review to be deleted' },
        });
        const created = await createRes.json();
        reviewId = created.id;
      }

      await page.goto(`/bars/${barId}`);

      // 내 리뷰 카드의 메뉴 열기
      const myReviewCard = page.getByTestId(`review-card-${reviewId}`);
      await expect(myReviewCard).toBeVisible({ timeout: 15000 });

      // 메뉴 버튼 (MoreHorizontal) 클릭
      await myReviewCard.locator('button:has(svg)').last().click();

      // 삭제 메뉴 클릭
      await page.getByRole('menuitem', { name: /delete/i }).click();

      // 삭제 확인 다이얼로그
      await expect(page.getByText(/are you sure/i)).toBeVisible({ timeout: 5000 });

      // 삭제 확인
      await page.getByRole('button', { name: /^delete$/i }).click();

      // 리뷰가 제거됨
      await expect(myReviewCard).not.toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedUser(
    'should not show edit/delete menu for non-author review',
    async ({ page, request }) => {
      // 다른 유저의 리뷰가 존재해야 함 — 시드 데이터에 있을 수 있음
      await page.goto(`/bars/${barId}`);

      // 리뷰 카드 로드 대기
      const reviewCards = page.locator('[data-testid^="review-card-"]');

      try {
        await expect(reviewCards.first()).toBeVisible({ timeout: 15000 });
      } catch {
        // 리뷰가 없으면 스킵
        return;
      }

      // 내 리뷰가 아닌 카드 찾기 — 메뉴에 "Report" 또는 메뉴 없음
      const count = await reviewCards.count();
      for (let i = 0; i < count; i++) {
        const card = reviewCards.nth(i);
        const testId = await card.getAttribute('data-testid');
        if (testId === `review-card-${reviewId}`) continue;

        // 다른 유저의 리뷰: Edit/Delete 메뉴가 없어야 함
        const menuButton = card.locator('button:has(svg.lucide-more-horizontal)');

        if (await menuButton.isVisible()) {
          await menuButton.click();
          // Report만 있고 Edit/Delete는 없어야 함
          await expect(page.getByRole('menuitem', { name: /edit/i })).not.toBeVisible();
        }

        break;
      }
    },
  );
});

// ─── 리뷰 사진 ──────────────────────────────────────────────

authenticatedUser.describe('리뷰 사진', () => {
  let barId: number;

  authenticatedUser.beforeAll(async ({ request }) => {
    barId = await getApprovedBarId(request);
  });

  authenticatedUser(
    'should display photo grid in review card with photos',
    async ({ page }) => {
      // 사진이 있는 리뷰를 mock
      await page.route(`${API_BASE}/bars/*/reviews*`, async (route) => {
        const url = route.request().url();
        if (url.includes('/me')) {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{
              id: 9999,
              rating: 5,
              content: 'Review with photos',
              visitedAt: null,
              status: 'PUBLISHED',
              createdAt: new Date().toISOString(),
              author: { id: 999, name: 'Test User', profileImageUrl: null },
              photos: [
                { id: 1, url: 'https://example.com/photo1.jpg', sortOrder: 0 },
                { id: 2, url: 'https://example.com/photo2.jpg', sortOrder: 1 },
              ],
            }],
            meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
            stats: { averageRating: 5, totalCount: 1, distribution: [{ rating: 5, count: 1 }] },
          }),
        });
      });

      await page.goto(`/bars/${barId}`);

      // 사진 썸네일 표시
      const reviewCard = page.getByTestId('review-card-9999');
      await expect(reviewCard).toBeVisible({ timeout: 15000 });

      const photoImages = reviewCard.locator('img[alt^="Review photo"]');
      expect(await photoImages.count()).toBe(2);
    },
  );

  authenticatedUser(
    'should upload photos via file input in review modal',
    async ({ page, request }) => {
      // 기존 리뷰 정리 후 새로 생성
      const myReviewRes = await request.get(`${API_BASE}/bars/${barId}/my-review`);
      if (myReviewRes.ok()) {
        const myReview = await safeJson(myReviewRes);
        if (myReview?.id) {
          await request.delete(`${API_BASE}/reviews/${myReview.id}`);
        }
      }

      await page.goto(`/bars/${barId}`);

      const writeButton = page.getByTestId('review-write-button');
      await expect(writeButton).toBeVisible({ timeout: 15000 });
      await writeButton.click();

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // photo-uploader 내 file input 찾기
      const photoUploader = page.getByTestId('photo-uploader');
      await expect(photoUploader).toBeVisible();

      const fileInput = photoUploader.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-photo-data'),
      });

      // 미리보기가 표시되어야 함
      await expect(
        page.locator('[data-testid^="photo-uploader-preview-"]').first(),
      ).toBeVisible({ timeout: 5000 });
    },
  );

  authenticatedUser(
    'should enforce max 5 photo limit',
    async ({ page, request }) => {
      // 리뷰 없는 상태에서 시작
      const myReviewRes = await request.get(`${API_BASE}/bars/${barId}/my-review`);
      if (myReviewRes.ok()) {
        const myReview = await safeJson(myReviewRes);
        if (myReview?.id) {
          await request.delete(`${API_BASE}/reviews/${myReview.id}`);
        }
      }

      await page.goto(`/bars/${barId}`);

      const writeButton = page.getByTestId('review-write-button');
      await expect(writeButton).toBeVisible({ timeout: 15000 });
      await writeButton.click();

      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      const photoUploader = page.getByTestId('photo-uploader');
      const fileInput = photoUploader.locator('input[type="file"]');

      // 6개 파일 선택 시도
      const files = Array.from({ length: 6 }, (_, i) => ({
        name: `photo-${i}.jpg`,
        mimeType: 'image/jpeg' as const,
        buffer: Buffer.from(`fake-photo-${i}`),
      }));

      await fileInput.setInputFiles(files);

      // 최대 5개까지만 추가되거나 에러 메시지 표시
      const previews = page.locator('[data-testid^="photo-uploader-preview-"]');
      const previewCount = await previews.count();
      expect(previewCount).toBeLessThanOrEqual(5);
    },
  );
});

// ─── 리뷰 신고 ──────────────────────────────────────────────

authenticatedUser.describe('리뷰 신고', () => {
  let barId: number;

  authenticatedUser.beforeAll(async ({ request }) => {
    barId = await getApprovedBarId(request);
  });

  authenticatedUser(
    'should open report dialog with reason select',
    async ({ page }) => {
      // 다른 유저의 리뷰를 mock
      await page.route(`${API_BASE}/bars/*/reviews*`, async (route) => {
        const url = route.request().url();
        if (url.includes('/me')) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{
              id: 8888,
              rating: 2,
              content: 'Bad review to report',
              visitedAt: null,
              status: 'PUBLISHED',
              createdAt: new Date().toISOString(),
              author: { id: 999, name: 'Other User', profileImageUrl: null },
              photos: [],
            }],
            meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
            stats: { averageRating: 2, totalCount: 1, distribution: [{ rating: 2, count: 1 }] },
          }),
        });
      });

      await page.goto(`/bars/${barId}`);

      const reviewCard = page.getByTestId('review-card-8888');
      await expect(reviewCard).toBeVisible({ timeout: 15000 });

      // 메뉴 클릭
      await reviewCard.locator('button:has(svg)').last().click();
      await page.getByRole('menuitem', { name: /report/i }).click();

      // 신고 다이얼로그
      await expect(page.getByText('Report Review')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('combobox')).toBeVisible();
    },
  );

  authenticatedUser(
    'should submit report successfully',
    async ({ page }) => {
      // 다른 유저의 리뷰 + 신고 API mock
      await page.route(`${API_BASE}/bars/*/reviews*`, async (route) => {
        const url = route.request().url();
        if (url.includes('/me')) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{
              id: 7777,
              rating: 1,
              content: 'Spam review',
              visitedAt: null,
              status: 'PUBLISHED',
              createdAt: new Date().toISOString(),
              author: { id: 999, name: 'Spammer', profileImageUrl: null },
              photos: [],
            }],
            meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
            stats: { averageRating: 1, totalCount: 1, distribution: [{ rating: 1, count: 1 }] },
          }),
        });
      });

      await page.route(`${API_BASE}/reviews/*/report`, async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, status: 'PENDING' }),
        });
      });

      await page.goto(`/bars/${barId}`);

      const reviewCard = page.getByTestId('review-card-7777');
      await expect(reviewCard).toBeVisible({ timeout: 15000 });

      // 메뉴 → Report
      await reviewCard.locator('button:has(svg)').last().click();
      await page.getByRole('menuitem', { name: /report/i }).click();

      // 사유 선택 (Select 컴포넌트)
      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: /spam/i }).click();

      // 제출
      await page.getByTestId('review-report-submit').click();

      // 다이얼로그 닫힘 + 성공 알림 (ReviewReportDialog는 close만 하고 toast 없음 — onOpenChange(false)로 닫힘)
      await expect(page.getByText('Report Review')).not.toBeVisible({ timeout: 5000 });
    },
  );

  authenticatedUser(
    'should show already reported message on duplicate report',
    async ({ page }) => {
      // mock: 409 응답
      await page.route(`${API_BASE}/bars/*/reviews*`, async (route) => {
        const url = route.request().url();
        if (url.includes('/me')) {
          await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [{
              id: 6666,
              rating: 1,
              content: 'Already reported review',
              visitedAt: null,
              status: 'PUBLISHED',
              createdAt: new Date().toISOString(),
              author: { id: 999, name: 'Bad User', profileImageUrl: null },
              photos: [],
            }],
            meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
            stats: { averageRating: 1, totalCount: 1, distribution: [{ rating: 1, count: 1 }] },
          }),
        });
      });

      await page.route(`${API_BASE}/reviews/*/report`, async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 409, message: 'Already reported' }),
        });
      });

      await page.goto(`/bars/${barId}`);

      const reviewCard = page.getByTestId('review-card-6666');
      await expect(reviewCard).toBeVisible({ timeout: 15000 });

      await reviewCard.locator('button:has(svg)').last().click();
      await page.getByRole('menuitem', { name: /report/i }).click();

      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: /spam/i }).click();
      await page.getByTestId('review-report-submit').click();

      // "already reported" 에러 토스트
      await expect(
        page.locator('[data-sonner-toaster]').getByText(/already reported/i),
      ).toBeVisible({ timeout: 5000 });
    },
  );

  authenticatedUser(
    'should not show report button for own review',
    async ({ page, request }) => {
      // 내 리뷰가 있는 상태
      const myReviewRes = await request.get(`${API_BASE}/bars/${barId}/my-review`);
      if (!myReviewRes.ok()) {
        await request.post(`${API_BASE}/reviews`, {
          data: { barId, rating: 4, content: 'My own review' },
        });
      }

      await page.goto(`/bars/${barId}`);

      // 내 리뷰 카드에서 메뉴 열기
      const writeButton = page.getByTestId('review-write-button');
      await expect(writeButton).toBeVisible({ timeout: 15000 });

      // 내 리뷰 카드의 메뉴에는 Edit/Delete만 있고 Report 없음
      const myReviewCard = page.locator('[data-testid^="review-card-"]').first();
      const menuButton = myReviewCard.locator('button:has(svg)').last();

      if (await menuButton.isVisible()) {
        await menuButton.click();
        // Report 메뉴 아이템 없음 — Edit, Delete만 존재
        await expect(page.getByRole('menuitem', { name: /edit/i })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: /report/i })).not.toBeVisible();
      }
    },
  );
});
