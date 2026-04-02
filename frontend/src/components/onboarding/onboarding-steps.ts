/** 온보딩 스텝 정의 — 13개 스텝 (Phase 1~3) */

/** 스텝 대기 조건 타입 */
export type WaitFor = 'next' | 'click' | 'mapPin' | 'navigation';

/** 툴팁 배치 방향 */
export type Placement = 'top' | 'bottom' | 'left' | 'right';

/** 온보딩 페이지 경로 */
export type OnboardingPage = '/search' | '/bars/[id]' | '/directions';

/** 단일 온보딩 스텝 정의 */
export interface StepDefinition {
  /** 하이라이트 대상 CSS 선택자 */
  target: string;
  /** 툴팁에 표시할 메시지 (HTML bold 허용) */
  message: string;
  /** 모바일에서 다른 메시지가 필요한 경우 */
  mobileMessage?: string;
  /** 다음 스텝으로 넘어가는 조건 */
  waitFor: WaitFor;
  /** 툴팁 배치 방향 (기본: bottom) */
  placement: Placement;
  /** 모바일 전용 배치 방향 */
  mobilePlacement?: Placement;
  /** 이 스텝이 속한 페이지 */
  page: OnboardingPage;
  /** 검색 탭 강제 전환 값 (Phase 1 전용) */
  forceTab?: string;
  /** 4-panel overlay 생략 (Sheet 등 자체 배경이 있는 컨텍스트 내 스텝) */
  skipOverlay?: boolean;
  /** flip 로직 비활성화 (공간 부족해도 지정 placement 강제 유지) */
  noFlip?: boolean;
}

/** 온보딩 이벤트 타입 */
export type OnboardingEvent =
  | { type: 'next' }
  | { type: 'click'; targetId: string }
  | { type: 'mapPin' }
  | { type: 'navigation'; pathname: string };

/** 전체 온보딩 스텝 목록 (13개: 0~12) */
export const ONBOARDING_STEPS: StepDefinition[] = [
  // Phase 1: 검색 페이지 (/search) — Step 0~6
  {
    target: '[data-tab="address"]',
    message:
      '<strong>Address</strong> — Search bars near a specific address.',
    waitFor: 'next',
    placement: 'bottom',
    page: '/search',
    forceTab: 'address',
  },
  {
    target: '[data-tab="name"]',
    message: '<strong>Name</strong> — Search by bar name directly.',
    waitFor: 'next',
    placement: 'bottom',
    page: '/search',
    forceTab: 'name',
  },
  {
    target: '[data-tab="both"]',
    message:
      '<strong>Both</strong> — Combine address and name for precise results.',
    waitFor: 'next',
    placement: 'bottom',
    page: '/search',
    forceTab: 'both',
  },
  {
    target: '[data-tab="map"]',
    message:
      "<strong>Map</strong> — Tap anywhere on the map to search nearby. Let's try this one!",
    waitFor: 'next',
    placement: 'bottom',
    page: '/search',
    forceTab: 'map',
  },
  {
    target: '[data-testid="map-view"]',
    message: 'Tap on the map to drop a pin.',
    waitFor: 'mapPin',
    placement: 'top',
    page: '/search',
  },
  {
    target: '#search-here-button',
    message: "Now tap 'Search here' to find nearby bars.",
    waitFor: 'click',
    placement: 'bottom',
    page: '/search',
  },
  {
    target: '[data-testid^="bar-card-"]:not([data-testid*="bookmark"])',
    message: 'Great! Tap any bar to see its details.',
    waitFor: 'navigation',
    placement: 'left',
    mobilePlacement: 'top',
    page: '/search',
  },

  // Phase 2: 바 상세 페이지 (/bars/[id]) — Step 7~9
  {
    target: '#directions-button',
    message: "Tap 'Directions' to see how to get there.",
    mobileMessage:
      "The Directions button is down here — tap it to see route info.",
    waitFor: 'click',
    placement: 'left',
    mobilePlacement: 'top',
    page: '/bars/[id]',
  },
  {
    target: '[data-slot="sheet-content"]',
    message: 'Check distance, time, and travel mode here.',
    waitFor: 'next',
    placement: 'left',
    mobilePlacement: 'top',
    page: '/bars/[id]',
    skipOverlay: true,
  },
  {
    target: '#get-directions-button',
    message: 'Tap to start real-time navigation.',
    waitFor: 'navigation',
    placement: 'top',
    page: '/bars/[id]',
    noFlip: true,
  },

  // Phase 3: 길안내 페이지 (/directions) — Step 10~12
  {
    target: '[data-testid="map-view"]',
    message: 'The blue dot on this map tracks your real-time location.',
    waitFor: 'next',
    placement: 'left',
    mobilePlacement: 'bottom',
    page: '/directions',
  },
  {
    target: 'button[aria-label="Refresh directions"]',
    message: 'Off route? Tap to recalculate from your current spot.',
    waitFor: 'next',
    placement: 'left',
    mobilePlacement: 'top',
    page: '/directions',
  },
  {
    target: '[data-onboarding-target="clear-route"]',
    message: 'Tap to reset and start a new search.',
    waitFor: 'next',
    placement: 'left',
    mobilePlacement: 'top',
    page: '/directions',
  },
];

/** 총 스텝 수 */
export const TOTAL_STEPS = ONBOARDING_STEPS.length;

/** localStorage 키 */
export const ONBOARDING_COMPLETED_KEY = 'onboarding-completed';

/** sessionStorage 키 */
export const ONBOARDING_STATE_KEY = 'onboarding-state';
