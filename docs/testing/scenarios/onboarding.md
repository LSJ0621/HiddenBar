# 온보딩 가이드 프론트엔드 단위 테스트 시나리오

> 4개 테스트 파일, 48개 시나리오 (2026-04-02 기준 전체 통과)

## OnboardingProvider (`onboarding-provider.test.tsx` — 15 tests)

### 초기화

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | localStorage에 onboarding-completed가 설정된 상태 | phase=idle 유지 | ✅ |
| 2 | 인증된 유저가 /search 진입 | phase=welcome, welcome 다이얼로그 렌더링 | ✅ |
| 3 | 미인증 유저 | phase=idle 유지 | ✅ |
| 4 | pathname이 /search가 아닌 경우 | phase=idle 유지 | ✅ |

### Start Tour / Skip

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | startTour 호출 | phase=active, currentStep=0 전환 | ✅ |
| 2 | skipTour 호출 | phase=idle 전환, localStorage에 완료 플래그 설정 | ✅ |

### 스텝 진행

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | waitFor=next 스텝에서 next() 호출 | 다음 스텝으로 진행 | ✅ |
| 2 | waitFor=mapPin 스텝에서 mapPin 이벤트 발행 | 다음 스텝으로 진행 | ✅ |
| 3 | waitFor=navigation 스텝에서 navigation 이벤트 발행 | 다음 스텝으로 진행 | ✅ |
| 4 | 현재 스텝의 waitFor와 불일치하는 이벤트 발행 | 스텝 변경 없음 | ✅ |

### End Tour

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | active 상태에서 endTour 호출 | phase=idle, localStorage 완료 플래그 설정 | ✅ |

### Complete phase

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | 전체 13스텝 순차 진행 완료 | phase=complete, complete 다이얼로그 렌더링 | ✅ |

### sessionStorage 유지/복원

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | active phase 진입 시 | sessionStorage에 phase/currentStep 저장 | ✅ |
| 2 | sessionStorage에 저장된 상태로 마운트 | 저장된 phase/currentStep 복원 | ✅ |
| 3 | endTour 호출 시 | sessionStorage 클리어 | ✅ |

---

## OnboardingOverlay (`onboarding-overlay.test.tsx` — 14 tests)

### OnboardingOverlay

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | target 요소가 없을 때 | 오버레이 미렌더링 (rect null) | ✅ |
| 2 | target 요소가 있을 때 | 4-panel Portal을 document.body에 렌더링 | ✅ |
| 3 | 패널 pointer-events | pointer-events-auto 클래스 적용 | ✅ |
| 4 | data-onboarding 속성 | wrapper에 data-onboarding 속성 설정 | ✅ |
| 5 | 오버레이 접근성 | aria-hidden=true 설정 | ✅ |
| 6 | 오버레이 z-index | z-[9998] 클래스 적용 | ✅ |
| 7 | 4-panel 위치 계산 | target rect 기반 top/bottom/left/right 패널 위치 계산 | ✅ |
| 8 | target 요소에 highlight 클래스 추가 | onboarding-highlight 클래스 부여 | ✅ |
| 9 | 언마운트 시 | target 요소에서 highlight 클래스 제거 | ✅ |
| 10 | viewport 밖 target | 오버레이 미렌더링 | ✅ |
| 11 | target 요소가 없을 때 타임아웃 | onRectChange(null) 호출 | ✅ |

### OnboardingTargetTracker

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | 렌더링 결과 | null 반환 (DOM 출력 없음) | ✅ |
| 2 | target rect 추적 | onRectChange 호출, 오버레이 미렌더링 | ✅ |
| 3 | highlight 클래스 | target에 onboarding-highlight 미적용 | ✅ |

---

## OnboardingTooltip (`onboarding-tooltip.test.tsx` — 12 tests)

### 메시지 렌더링

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | 스텝 메시지 표시 | 현재 스텝의 message 텍스트 렌더링 | ✅ |
| 2 | HTML 렌더링 | strong 태그 등 HTML 마크업 렌더링 | ✅ |
| 3 | 스텝 카운터 | "N / 13" 형태 진행률 표시 | ✅ |
| 4 | 다른 스텝 카운터 | 올바른 인덱스로 카운터 표시 | ✅ |

### Next 버튼

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | waitFor=next 스텝 | Next 버튼 표시 | ✅ |
| 2 | waitFor=click 스텝 | Next 버튼 숨김 | ✅ |
| 3 | waitFor=mapPin 스텝 | Next 버튼 숨김 | ✅ |
| 4 | waitFor=navigation 스텝 | Next 버튼 숨김 | ✅ |
| 5 | Next 버튼 클릭 | next() 콜백 호출 | ✅ |

### End tour 버튼

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | End tour 버튼 렌더링 | 항상 표시 | ✅ |
| 2 | End tour 버튼 클릭 | endTour() 콜백 호출 | ✅ |

### 접근성

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | tooltip 요소 | role=tooltip 설정 | ✅ |

---

## OnboardingDialog (`onboarding-dialog.test.tsx` — 7 tests)

### Welcome 다이얼로그

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | type=welcome 렌더링 | 환영 제목 텍스트 표시 | ✅ |
| 2 | 버튼 구성 | Start Tour + Skip 버튼 표시 | ✅ |
| 3 | Start Tour 클릭 | startTour 콜백 호출 | ✅ |
| 4 | Skip 클릭 | skipTour 콜백 호출 | ✅ |

### Complete 다이얼로그

| # | 시나리오 | 기대 결과 | 커버 |
|---|---------|----------|------|
| 1 | type=complete 렌더링 | 완료 제목 텍스트 표시 | ✅ |
| 2 | 버튼 구성 | Done 버튼 표시 | ✅ |
| 3 | Done 클릭 | endTour 콜백 호출 | ✅ |
