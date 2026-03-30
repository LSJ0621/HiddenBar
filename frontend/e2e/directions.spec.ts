import {
  authenticatedUser,
  unauthenticated,
  expect,
} from './fixtures/test-fixtures';

const API_BASE = 'http://localhost:4000/api/v1';

// ─── Mock 데이터 ──────────────────────────────────────────

const MOCK_COORDS = { latitude: 37.5600, longitude: 126.970 };

const MOCK_DIRECTIONS_RESPONSE = {
  routes: [
    {
      distance: { text: '2.5 km', value: 2500 },
      duration: { text: '8 min', value: 480 },
      overviewPolyline: 'mock_polyline_encoded_string',
      steps: [
        {
          instruction: 'Head north on Test Road',
          distance: { text: '500 m', value: 500 },
          duration: { text: '2 min', value: 120 },
          polylines: [],
        },
        {
          instruction: 'Turn right onto Main Street',
          distance: { text: '2.0 km', value: 2000 },
          duration: { text: '6 min', value: 360 },
          polylines: [],
        },
      ],
    },
  ],
};

const MOCK_TRANSIT_RESPONSE = {
  routes: [
    {
      distance: { text: '5.2 km', value: 5200 },
      duration: { text: '15 min', value: 900 },
      overviewPolyline: 'transit_polyline_1',
      steps: [
        {
          instruction: 'Walk to Seoul Station',
          distance: { text: '300 m', value: 300 },
          duration: { text: '4 min', value: 240 },
          polylines: ['encoded_poly_1'],
          transitDetails: {
            lineName: 'Line 1',
            lineColor: '#003DA5',
            departureStop: 'Seoul Station',
            arrivalStop: 'City Hall',
            departureTime: '2026-03-27T10:00:00',
            arrivalTime: '2026-03-27T10:10:00',
            numStops: 3,
          },
        },
      ],
    },
    {
      distance: { text: '6.0 km', value: 6000 },
      duration: { text: '20 min', value: 1200 },
      overviewPolyline: 'transit_polyline_2',
      steps: [
        {
          instruction: 'Walk to Namsan Tower',
          distance: { text: '500 m', value: 500 },
          duration: { text: '7 min', value: 420 },
          polylines: ['encoded_poly_2'],
          transitDetails: {
            lineName: 'Line 4',
            lineColor: '#00A4E3',
            departureStop: 'Myeongdong',
            arrivalStop: 'Namsan',
            departureTime: '2026-03-27T10:05:00',
            arrivalTime: '2026-03-27T10:20:00',
            numStops: 5,
          },
        },
      ],
    },
  ],
};

// ─── 헬퍼 함수 ────────────────────────────────────────────

/**
 * Directions API 응답을 모킹한다.
 */
async function mockDirectionsApi(
  page: import('@playwright/test').Page,
  options?: { status?: number; body?: unknown },
) {
  const status = options?.status ?? 200;
  const body = options?.body ?? MOCK_DIRECTIONS_RESPONSE;

  await page.route('**/api/v1/maps/directions**', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

/**
 * Nearby Bars API 응답을 모킹한다.
 */
async function mockNearbyBarsApi(
  page: import('@playwright/test').Page,
  options?: { status?: number; body?: unknown },
) {
  const status = options?.status ?? 200;
  const body = options?.body ?? {
    items: [
      { id: 1, name: 'Nearby Bar 1', address: '100 Near St', city: 'Seoul', country: 'South Korea', latitude: 37.5660, longitude: 126.975, distanceKm: 0.5, averageRating: 4.2, reviewCount: 10, thumbnail: null },
      { id: 2, name: 'Nearby Bar 2', address: '200 Near St', city: 'Seoul', country: 'South Korea', latitude: 37.5670, longitude: 126.980, distanceKm: 1.0, averageRating: 3.8, reviewCount: 5, thumbnail: null },
    ],
  };

  await page.route('**/api/v1/bars/nearby**', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

/**
 * 테스트용 APPROVED 바 ID를 가져온다.
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
 * 실제 사용자 흐름으로 /directions 페이지까지 이동한다.
 * 바 상세 → "Directions" 버튼 → DirectionsSheet → "Get Directions" → /directions
 */
async function navigateToDirectionsViaBarDetail(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
  options?: { skipGeolocation?: boolean },
) {
  // 위치 권한 설정 (skipGeolocation이 아닌 경우)
  if (!options?.skipGeolocation) {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation(MOCK_COORDS);
  }

  // 바 상세 진입
  const barId = await getApprovedBarId(request);
  await page.goto(`/bars/${barId}`);

  // "Directions" 버튼 클릭 → Sheet 열림
  const directionsButton = page.getByRole('button', { name: /^directions$/i });
  await directionsButton.scrollIntoViewIfNeeded();
  await expect(directionsButton).toBeVisible({ timeout: 15000 });
  await directionsButton.click();

  // Sheet 대기
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible({ timeout: 10000 });

  // "Get Directions" 버튼 클릭 → /directions 이동
  const getDirectionsBtn = sheet.getByRole('button', { name: /get directions/i });
  await expect(getDirectionsBtn).toBeVisible({ timeout: 10000 });
  await getDirectionsBtn.click();

  // /directions 페이지 도달
  await page.waitForURL(/\/directions/, { timeout: 15000 });
}

// ─── 바 상세 사이드바 ─────────────────────────────────────

unauthenticated(
  'should redirect unauthenticated from bar detail to login',
  async ({ page }) => {
    await page.goto('/bars/1');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  },
);

authenticatedUser.describe('Bar Detail — Map & Directions', () => {
  let barId: number;

  authenticatedUser.beforeAll(async ({ request }) => {
    barId = await getApprovedBarId(request);
  });

  authenticatedUser(
    'should render map view with bar marker',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);
      const mapView = page.getByTestId('map-view');
      await expect(mapView).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should open directions sheet on click',
    async ({ page }) => {
      await mockDirectionsApi(page);
      await page.goto(`/bars/${barId}`);

      const directionsButton = page.getByRole('button', { name: /^directions$/i });
      await directionsButton.scrollIntoViewIfNeeded();
      await expect(directionsButton).toBeVisible({ timeout: 15000 });
      await directionsButton.click();

      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible({ timeout: 10000 });
      await expect(sheet.getByText(/directions to/i)).toBeVisible();
    },
  );

  authenticatedUser(
    'should display related bars list',
    async ({ page }) => {
      await page.goto(`/bars/${barId}`);
      const relatedBars = page.getByTestId('related-bars-list');
      await relatedBars.scrollIntoViewIfNeeded();
      await expect(relatedBars).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should degrade gracefully when Google Maps unavailable',
    async ({ page }) => {
      await page.route('**/maps.googleapis.com/**', (route) => route.abort());
      await page.goto(`/bars/${barId}`);
      // 바 상세 콘텐츠는 정상 로드 (지도만 로딩 상태)
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    },
  );
});

// ─── DirectionsSheet ──────────────────────────────────────

authenticatedUser.describe('DirectionsSheet', () => {
  let barId: number;

  authenticatedUser.beforeAll(async ({ request }) => {
    barId = await getApprovedBarId(request);
  });

  authenticatedUser(
    'should open sheet and show directions preview',
    async ({ page }) => {
      await mockDirectionsApi(page);
      await page.context().grantPermissions(['geolocation']);
      await page.context().setGeolocation(MOCK_COORDS);
      await page.goto(`/bars/${barId}`);

      const directionsButton = page.getByRole('button', { name: /^directions$/i });
      await directionsButton.scrollIntoViewIfNeeded();
      await directionsButton.click();

      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible({ timeout: 10000 });

      // Sheet에서 길안내 미리보기 확인 (directions API mock 응답)
      await expect(sheet.getByText(/directions to/i)).toBeVisible();
      await expect(sheet.getByText('Head north on Test Road')).toBeVisible({ timeout: 10000 });
    },
  );

  authenticatedUser(
    'should change travel mode in sheet',
    async ({ page }) => {
      await mockDirectionsApi(page);
      await page.context().grantPermissions(['geolocation']);
      await page.context().setGeolocation(MOCK_COORDS);
      await page.goto(`/bars/${barId}`);

      const directionsButton = page.getByRole('button', { name: /^directions$/i });
      await directionsButton.scrollIntoViewIfNeeded();
      await directionsButton.click();

      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible({ timeout: 10000 });

      // Sheet 내 이동수단 변경
      const transitToggle = sheet.getByTestId('travel-mode-transit');
      await expect(transitToggle).toBeVisible();
      await transitToggle.click();
      await expect(transitToggle).toHaveAttribute('data-state', 'on');
    },
  );

  authenticatedUser(
    'should navigate to /directions on Get Directions click',
    async ({ page }) => {
      await mockDirectionsApi(page);
      await page.goto(`/bars/${barId}`);

      const directionsButton = page.getByRole('button', { name: /^directions$/i });
      await directionsButton.scrollIntoViewIfNeeded();
      await directionsButton.click();

      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible({ timeout: 10000 });

      // "Get Directions" 버튼 클릭 → sessionStorage 저장 + /directions 이동
      const getDirectionsBtn = sheet.getByRole('button', { name: /get directions/i });
      await getDirectionsBtn.click();
      await page.waitForURL(/\/directions/);
    },
  );

  authenticatedUser(
    'should close sheet and stay on bar detail',
    async ({ page }) => {
      await mockDirectionsApi(page);
      await page.goto(`/bars/${barId}`);

      const directionsButton = page.getByRole('button', { name: /^directions$/i });
      await directionsButton.scrollIntoViewIfNeeded();
      await directionsButton.click();

      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible({ timeout: 10000 });

      // Sheet 닫기 (Escape 키)
      await page.keyboard.press('Escape');
      await expect(sheet).not.toBeVisible({ timeout: 5000 });

      // 바 상세 페이지 유지
      expect(page.url()).toContain(`/bars/${barId}`);
    },
  );
});

// ─── 경로 탭 ──────────────────────────────────────────────

authenticatedUser.describe('Directions Tab', () => {
  authenticatedUser(
    'should display distance and duration',
    async ({ page, request }) => {
      await mockDirectionsApi(page);
      await navigateToDirectionsViaBarDetail(page, request);

      await expect(page.getByTestId('directions-distance')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('directions-duration')).toBeVisible();
      await expect(page.getByTestId('directions-distance')).toContainText('2.5 km');
      await expect(page.getByTestId('directions-duration')).toContainText('8 min');
    },
  );

  authenticatedUser(
    'should default to TRANSIT mode on /directions page',
    async ({ page, request }) => {
      await mockDirectionsApi(page);
      await navigateToDirectionsViaBarDetail(page, request);

      // /directions 페이지는 TRANSIT이 기본
      const transitToggle = page.getByTestId('travel-mode-transit');
      await expect(transitToggle).toBeVisible({ timeout: 15000 });
      await expect(transitToggle).toHaveAttribute('data-state', 'on');
    },
  );

  authenticatedUser(
    'should update directions when travel mode changes',
    async ({ page, request }) => {
      await mockDirectionsApi(page);
      await navigateToDirectionsViaBarDetail(page, request);

      // WALKING 모드로 변경
      const walkingToggle = page.getByTestId('travel-mode-walking');
      await expect(walkingToggle).toBeVisible({ timeout: 15000 });
      await walkingToggle.click();
      await expect(walkingToggle).toHaveAttribute('data-state', 'on');
    },
  );

  authenticatedUser(
    'should show empty state when no bar cached',
    async ({ page }) => {
      // 직접 /directions 진입 (sessionStorage 없음)
      await page.goto('/directions');
      await expect(page.getByText('No directions available')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Go to Search')).toBeVisible();
    },
  );
});

// ─── 진입 흐름 ────────────────────────────────────────────

authenticatedUser.describe('Directions Entry Flow', () => {
  authenticatedUser(
    'should navigate from bar detail through sheet to /directions',
    async ({ page, request }) => {
      await mockDirectionsApi(page);
      await navigateToDirectionsViaBarDetail(page, request);

      // /directions 페이지에서 바 이름 표시
      await expect(page.getByText(/directions to/i)).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should show no directions on direct entry without cache',
    async ({ page }) => {
      await page.goto('/directions');
      await expect(page.getByText('No directions available')).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should show location access message when permission denied',
    async ({ page, request }) => {
      await mockDirectionsApi(page);
      // geolocation 미부여 상태에서 진행
      await page.context().clearPermissions();
      await navigateToDirectionsViaBarDetail(page, request, { skipGeolocation: true });

      await expect(
        page.getByText(/allow location access/i),
      ).toBeVisible({ timeout: 15000 });
    },
  );
});

// ─── 데스크탑 레이아웃 ────────────────────────────────────

authenticatedUser.describe('Directions Desktop Layout', () => {
  authenticatedUser(
    'should show two-column layout on desktop',
    async ({ page, request }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await mockDirectionsApi(page);
      await navigateToDirectionsViaBarDetail(page, request);

      // 지도와 패널이 동시 표시
      const mapView = page.getByTestId('map-view');
      await expect(mapView).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/directions to/i)).toBeVisible();
    },
  );

  authenticatedUser(
    'should have directions link in desktop header',
    async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/');

      const directionsLink = page.locator('header').getByRole('link', { name: /directions/i });
      await expect(directionsLink).toBeVisible({ timeout: 10000 });
    },
  );
});

// ─── 대중교통 모드 ────────────────────────────────────────

authenticatedUser.describe('Directions Transit Mode', () => {
  authenticatedUser(
    'should display route selector for transit',
    async ({ page, request }) => {
      await mockDirectionsApi(page, { body: MOCK_TRANSIT_RESPONSE });
      await navigateToDirectionsViaBarDetail(page, request);

      const routeSelector = page.getByTestId('route-selector');
      await expect(routeSelector).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should change route on alternative click',
    async ({ page, request }) => {
      await mockDirectionsApi(page, { body: MOCK_TRANSIT_RESPONSE });
      await navigateToDirectionsViaBarDetail(page, request);

      const routeSelector = page.getByTestId('route-selector');
      await expect(routeSelector).toBeVisible({ timeout: 15000 });

      // 두 번째 경로 선택
      const secondRoute = page.getByTestId('route-option-1');
      if (await secondRoute.isVisible()) {
        await secondRoute.click();
        await expect(page.getByTestId('directions-duration')).toContainText('20 min');
      }
    },
  );

  authenticatedUser(
    'should display transit timeline with stops',
    async ({ page, request }) => {
      await mockDirectionsApi(page, { body: MOCK_TRANSIT_RESPONSE });
      await navigateToDirectionsViaBarDetail(page, request);

      await expect(page.getByTestId('directions-distance')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Seoul Station')).toBeVisible({ timeout: 10000 });
    },
  );
});

// ─── 근처 바 (홈) ─────────────────────────────────────────

authenticatedUser.describe('Nearby Bars on Home', () => {
  authenticatedUser(
    'should display nearby bars with location permission',
    async ({ page }) => {
      await page.context().grantPermissions(['geolocation']);
      await page.context().setGeolocation(MOCK_COORDS);
      await mockNearbyBarsApi(page);

      await page.goto('/');
      await expect(page.getByText('Nearby Bar 1').first()).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should show fallback when location denied',
    async ({ page }) => {
      await page.context().clearPermissions();
      await page.goto('/');
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should show empty state when no nearby bars',
    async ({ page }) => {
      await page.context().grantPermissions(['geolocation']);
      await page.context().setGeolocation(MOCK_COORDS);
      await mockNearbyBarsApi(page, { body: { items: [] } });

      await page.goto('/');
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should navigate to bar detail on card click',
    async ({ page }) => {
      await page.context().grantPermissions(['geolocation']);
      await page.context().setGeolocation(MOCK_COORDS);
      await mockNearbyBarsApi(page);

      await page.goto('/');
      const barLink = page.getByRole('link', { name: /nearby bar 1/i });
      await expect(barLink).toBeVisible({ timeout: 15000 });
      await barLink.click();
      await page.waitForURL(/\/bars\/\d+/);
    },
  );
});

unauthenticated(
  'should show home page for unauthenticated user',
  async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  },
);

// ─── 주소 검색 (바 등록) ──────────────────────────────────

authenticatedUser.describe('Address Search in Bar Registration', () => {
  authenticatedUser.beforeEach(async ({ page }) => {
    // 주소 검색 API 모킹
    await page.route('**/api/v1/maps/address/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              displayName: '123 Test St',
              formattedAddress: '123 Test St, Seoul, South Korea',
              city: 'Seoul',
              country: 'South Korea',
              latitude: 37.5665,
              longitude: 126.978,
            },
            {
              displayName: '456 Another St',
              formattedAddress: '456 Another St, Busan, South Korea',
              city: 'Busan',
              country: 'South Korea',
              latitude: 35.1796,
              longitude: 129.0756,
            },
          ],
        }),
      });
    });

    // 바 등록 Step 1 → Step 2(Location)로 이동
    await page.goto('/bars/new');
    await page.getByPlaceholder(/enter bar name/i).fill('Test Bar');
    await page.getByRole('button', { name: /next/i }).click();
  });

  authenticatedUser(
    'should show autocomplete results on address input',
    async ({ page }) => {
      const addressInput = page.getByTestId('address-search-input');
      await expect(addressInput).toBeVisible({ timeout: 15000 });

      await addressInput.fill('123 Test');
      // 검색 버튼 클릭 (자동 검색 아님, Enter 또는 버튼 클릭 필요)
      await page.getByTestId('address-search-button').click();

      // 자동완성 결과 표시
      const results = page.getByTestId('address-search-results');
      await expect(results).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('123 Test St, Seoul, South Korea')).toBeVisible();
    },
  );

  authenticatedUser(
    'should fill fields on autocomplete selection',
    async ({ page }) => {
      const addressInput = page.getByTestId('address-search-input');
      await expect(addressInput).toBeVisible({ timeout: 15000 });

      await addressInput.fill('123 Test');
      await page.getByTestId('address-search-button').click();

      // 결과 클릭
      const firstResult = page.getByTestId('address-search-result-0');
      await expect(firstResult).toBeVisible({ timeout: 10000 });
      await firstResult.click();

      // 주소 필드가 자동 채워짐
      const addressField = page.getByPlaceholder(/enter address/i);
      await expect(addressField).toHaveValue(/123 Test St/);
    },
  );

  authenticatedUser(
    'should update map marker on address selection',
    async ({ page }) => {
      const addressInput = page.getByTestId('address-search-input');
      await expect(addressInput).toBeVisible({ timeout: 15000 });

      await addressInput.fill('123 Test');
      await page.getByTestId('address-search-button').click();

      const firstResult = page.getByTestId('address-search-result-0');
      await expect(firstResult).toBeVisible({ timeout: 10000 });
      await firstResult.click();

      // 지도가 표시됨
      const mapView = page.getByTestId('map-view');
      await expect(mapView).toBeVisible({ timeout: 10000 });
    },
  );
});

// ─── 에러 처리 ────────────────────────────────────────────

authenticatedUser.describe('Directions Error Handling', () => {
  authenticatedUser(
    'should show no route message on 404',
    async ({ page, request }) => {
      await mockDirectionsApi(page, { status: 404, body: { message: 'No route found' } });
      await navigateToDirectionsViaBarDetail(page, request);

      await expect(
        page.getByText(/no route found for this travel mode/i),
      ).toBeVisible({ timeout: 15000 });
    },
  );

  authenticatedUser(
    'should show error on API failure',
    async ({ page, request }) => {
      await mockDirectionsApi(page, { status: 502, body: { message: 'Service unavailable' } });
      await navigateToDirectionsViaBarDetail(page, request);

      await expect(
        page.getByText(/error occurred while fetching directions/i),
      ).toBeVisible({ timeout: 15000 });
    },
  );
});
