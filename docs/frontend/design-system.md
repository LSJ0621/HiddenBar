# Hidden Bar — Design System

> **작성일**: 2026-03-14
> **Phase**: 2 (UI Designer)
> **기반**: `docs/frontend/ux-redesign.md` (Phase 1 산출물)
> **산출물**: `frontend/src/app/globals.css` (CSS 변수), 이 문서

---

## 1. 서비스 아이덴티티

### 1.1 톤앤매너: "Modern Speakeasy"

Hidden Bar는 전 세계의 숨겨진 바를 발견하는 서비스다. 디자인은 **스피크이지에 들어서는 순간의 감각** — 어두운 조명 아래 따뜻한 앰버 빛이 감도는 세련되고 은밀한 분위기를 시각적으로 구현한다.

| 속성 | 방향 | 피해야 할 것 |
|------|------|-------------|
| **온도** | 따뜻함 (warm) — 앰버, 크림, 차콜 | 차가운 블루/그레이 톤 |
| **밀도** | 절제된 여백 — 정보를 정돈되게 | 빽빽하거나 어수선한 배치 |
| **격식** | 세련됨 (refined) — 고급 바의 분위기 | 캐주얼하거나 유치한 톤 |
| **움직임** | 부드러움 (smooth) — 위스키가 잔에 따르는 듯 | 과격하거나 산만한 애니메이션 |
| **대비** | 명확함 — 핵심 정보와 배경의 계층이 뚜렷 | 모든 요소가 동일한 시각적 무게 |

### 1.2 키워드

`sophisticated` · `intimate` · `warm` · `curated` · `inviting`

---

## 2. 컬러 시스템

### 2.1 설계 원칙

- **앰버/골드가 주역**: Primary 컬러는 위스키와 촛불을 연상시키는 풍부한 앰버. 모든 주요 인터랙션(버튼, 링크, 포커스 링)에 사용
- **따뜻한 뉴트럴**: 순수한 흰색(#fff)이나 순수한 검정(#000) 대신, 미세한 따뜻한 톤이 가미된 크림/차콜 사용
- **oklch 색공간**: 지각적으로 균일한 밝기 표현을 위해 oklch 사용. Tailwind CSS v4와 호환

### 2.2 라이트 모드

| 토큰 | oklch 값 | 용도 |
|------|----------|------|
| `--background` | `oklch(0.985 0.003 80)` | 페이지 배경 (따뜻한 크림 화이트) |
| `--foreground` | `oklch(0.165 0.015 50)` | 본문 텍스트 (따뜻한 근사 검정) |
| `--card` | `oklch(0.975 0.005 75)` | 카드 배경 (배경보다 미세하게 따뜻한) |
| `--card-foreground` | `oklch(0.165 0.015 50)` | 카드 텍스트 |
| `--primary` | `oklch(0.62 0.16 55)` | 주요 액션 (풍부한 앰버) |
| `--primary-foreground` | `oklch(0.99 0.002 80)` | Primary 위의 텍스트 |
| `--secondary` | `oklch(0.945 0.008 70)` | 보조 배경 (따뜻한 라이트 그레이) |
| `--secondary-foreground` | `oklch(0.25 0.015 50)` | 보조 배경 위 텍스트 |
| `--muted` | `oklch(0.945 0.008 70)` | 비활성/배경 요소 |
| `--muted-foreground` | `oklch(0.50 0.015 50)` | 보조 텍스트, 캡션, placeholder |
| `--accent` | `oklch(0.945 0.02 65)` | 호버 배경, 하이라이트 (연한 앰버 틴트) |
| `--accent-foreground` | `oklch(0.25 0.015 50)` | Accent 위 텍스트 |
| `--destructive` | `oklch(0.55 0.235 27)` | 삭제, 에러 (따뜻한 레드) |
| `--warning` | `oklch(0.75 0.15 75)` | 경고, 심사중 배너 |
| `--warning-foreground` | `oklch(0.30 0.06 55)` | 경고 위 텍스트 |
| `--success` | `oklch(0.62 0.15 155)` | 성공, 영업중 상태 |
| `--success-foreground` | `oklch(0.99 0.002 80)` | 성공 위 텍스트 |
| `--border` | `oklch(0.91 0.008 70)` | 테두리 (따뜻한 그레이) |
| `--input` | `oklch(0.91 0.008 70)` | 입력 필드 테두리 |
| `--ring` | `oklch(0.62 0.16 55)` | 포커스 링 (앰버) |
| `--teal` | `oklch(0.55 0.15 175)` | 섹션 레이블 액센트 (홈 섹션 헤더 mono 레이블) |
| `--cream-dim` | `oklch(0.45 0.015 50)` | 디밍된 크림 톤 |

### 2.3 다크 모드

| 토큰 | oklch 값 | 용도 |
|------|----------|------|
| `--background` | `oklch(0.145 0.012 50)` | 페이지 배경 (따뜻한 딥 차콜) |
| `--foreground` | `oklch(0.93 0.008 75)` | 본문 텍스트 (따뜻한 크림) |
| `--card` | `oklch(0.195 0.014 50)` | 카드 배경 (약간 밝은 차콜) |
| `--card-foreground` | `oklch(0.93 0.008 75)` | 카드 텍스트 |
| `--primary` | `oklch(0.75 0.15 65)` | 주요 액션 (밝은 앰버) |
| `--primary-foreground` | `oklch(0.145 0.012 50)` | Primary 위 텍스트 (딥 차콜) |
| `--secondary` | `oklch(0.25 0.012 50)` | 보조 배경 (어두운 따뜻한 그레이) |
| `--secondary-foreground` | `oklch(0.93 0.008 75)` | 보조 배경 위 텍스트 |
| `--muted` | `oklch(0.25 0.012 50)` | 비활성/배경 요소 |
| `--muted-foreground` | `oklch(0.62 0.015 55)` | 보조 텍스트 |
| `--accent` | `oklch(0.25 0.02 55)` | 호버 배경 |
| `--accent-foreground` | `oklch(0.93 0.008 75)` | Accent 위 텍스트 |
| `--destructive` | `oklch(0.68 0.19 22)` | 삭제, 에러 |
| `--warning` | `oklch(0.78 0.14 75)` | 경고, 심사중 배너 |
| `--warning-foreground` | `oklch(0.20 0.04 55)` | 경고 위 텍스트 |
| `--success` | `oklch(0.70 0.14 155)` | 성공, 영업중 상태 |
| `--success-foreground` | `oklch(0.145 0.012 50)` | 성공 위 텍스트 |
| `--border` | `oklch(1 0 0 / 12%)` | 테두리 (미묘한 화이트) |
| `--input` | `oklch(1 0 0 / 15%)` | 입력 필드 테두리 |
| `--ring` | `oklch(0.75 0.15 65)` | 포커스 링 (밝은 앰버) |
| `--teal` | `oklch(0.76 0.14 175)` | 섹션 레이블 액센트 (라이트보다 밝게) |
| `--cream-dim` | `oklch(0.55 0.02 70)` | 디밍된 크림 톤 |

### 2.4 시맨틱 컬러 사용 가이드

| 시나리오 | 사용할 토큰 | 예시 |
|----------|-----------|------|
| CTA 버튼 (바 등록, 검색, 회원가입) | `primary` | `bg-primary text-primary-foreground` |
| 보조 버튼 (취소, 필터 초기화) | `secondary` | `bg-secondary text-secondary-foreground` |
| 고스트/텍스트 버튼 | `accent` (hover) | `hover:bg-accent hover:text-accent-foreground` |
| 삭제/위험 액션 | `destructive` | `bg-destructive text-white` |
| 심사 대기(PENDING) 배너 | `warning` | `bg-warning text-warning-foreground` |
| 심사 거절(REJECTED) 배너 | `destructive` (배경 10%) | `bg-destructive/10 text-destructive` |
| 영업중/승인됨 배지 | `success` | `bg-success/10 text-success` |
| 보조 텍스트, placeholder | `muted-foreground` | `text-muted-foreground` |
| 비활성 영역, 스켈레톤 | `muted` | `bg-muted` |
| CTA 배너 (회원가입 유도 — 홈 다크 컨텍스트) | 랜딩 amber CSS 변수 | `border border-landing-brown/20 bg-[#080402]`, 버튼: `border-landing-brown text-landing-amber hover:border-landing-amber` |
| CTA 배너 (바 등록 유도 — 홈 다크 컨텍스트) | 랜딩 teal CSS 변수 | `border border-landing-teal/20 bg-[#080402]`, 버튼: `border-landing-teal/30 text-landing-teal hover:border-landing-teal` |
| 섹션 아이브로우 레이블 (홈 카테고리/인기/근처) | 랜딩 teal CSS 변수 | `section-label-line font-mono text-[9px] tracking-[0.42em] uppercase text-landing-teal` |

### 2.5 스피크이지 랜딩 팔레트 (CSS 변수)

홈/랜딩 페이지는 `globals.css`의 `--landing-*` CSS 변수로 정의된 전용 색상 팔레트를 사용한다. Tailwind `landing-*` 클래스로 참조하며, 시스템 테마(라이트/다크)와 무관하게 고정된다.

| 이름 | 값 | CSS 변수 | Tailwind 클래스 | 용도 |
|------|-----|----------|----------------|------|
| amber | `#e8973a` | `--landing-amber` | `landing-amber` | 히어로 강조 텍스트, neon glow, 버튼 텍스트, 커서, 섹션 em 강조 |
| brown | `#9B5E1A` | `--landing-brown` | `landing-brown` | 아이브로우 텍스트, 보더(투명도 변형 포함), 스크롤 힌트 수직선 |
| teal | `#3ECFB2` | `--landing-teal` | `landing-teal` | 섹션 레이블(section-label-line), 바 등록 CTA 테두리/버튼 |
| cream | `#F0E0C0` | `--landing-cream` | `landing-cream` | 기본 텍스트, H1/H2, 카테고리 카드 레이블 |
| tan | `#9a8060` | `--landing-tan` | `landing-tan` | 자막, 보조 텍스트, manifesto 부제 |
| charcoal | `#120e0a` | `--landing-charcoal` | `landing-charcoal` | 카테고리 카드 hover 배경 |
| dark | `#0a0604` | `--landing-dark` | `landing-dark` | 페이지 전체 배경 |
| deep | `#1a1410` | `--landing-deep` | `landing-deep` | 그라데이션 끝점, 딥 배경 |

### 2.6 차트 팔레트

따뜻하고 세련된 톤으로 구성. 관리자 대시보드 통계에 사용.

| 토큰 | 라이트 | 다크 | 용도 |
|------|--------|------|------|
| `--chart-1` | 앰버 | 밝은 앰버 | 주요 데이터 |
| `--chart-2` | 틸 | 밝은 틸 | 보조 데이터 |
| `--chart-3` | 코퍼/테라코타 | 따뜻한 오렌지 | 제3 데이터 |
| `--chart-4` | 슬레이트 블루 | 블루 | 제4 데이터 |
| `--chart-5` | 로즈 | 밝은 로즈 | 제5 데이터 |

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

| 역할 | 폰트 | CSS 변수 | 용도 |
|------|------|----------|------|
| **Display** | Instrument Serif | `--font-display` (`font-display`) | 페이지 제목, 히어로 텍스트, 섹션 제목 — 세리프체의 우아함으로 서비스 아이덴티티 강화 |
| **Body** | Geist | `--font-geist-sans` (`font-sans`) | 본문 텍스트, 버튼, 레이블, 네비게이션 — 깔끔한 가독성 |
| **Mono** | Geist Mono | `--font-geist-mono` (`font-mono`) | 가격, 영업시간 등 데이터 수치 표시 (선택적) |

### 3.2 타이포그래피 계층

Tailwind 유틸리티 클래스 기반. 커스텀 CSS 클래스 없이 조합하여 사용한다.

| 레벨 | 용도 | Tailwind 클래스 | 예시 |
|------|------|----------------|------|
| **Display** | 히어로 제목 | `font-display text-4xl md:text-5xl lg:text-6xl tracking-tight` | "숨겨진 바를 발견하세요" |
| **H1** | 페이지 제목 | `font-display text-3xl md:text-4xl tracking-tight` | "검색 결과", "내 바 목록" |
| **H2** | 섹션 제목 | `font-display text-2xl md:text-3xl` | "인기 바", "근처 바", "영업시간" |
| **H3** | 카드 제목, 서브 섹션 | `text-xl font-semibold` | 바 이름 (카드 내), 필터 그룹 제목 |
| **H4** | 소제목 | `text-lg font-medium` | 아코디언 헤더, 리스트 그룹 제목 |
| **Body** | 본문 텍스트 | `text-base` | 바 설명, 일반 콘텐츠 |
| **Body Small** | 보조 텍스트 | `text-sm text-muted-foreground` | 메타 정보, 캡션, 도움말 |
| **Caption** | 최소 텍스트 | `text-xs text-muted-foreground` | 타임스탬프, 부가 정보 |
| **Data** | 가격, 시간 수치 | `font-mono text-sm` | "₩15,000", "18:00 - 02:00" |

### 3.3 Display 폰트 사용 규칙

- **사용하는 곳**: 히어로 텍스트, 페이지 제목(H1), 섹션 제목(H2)
- **사용하지 않는 곳**: 버튼 텍스트, 네비게이션, 입력 필드, 데이터 테이블, 캡션
- 항상 `tracking-tight`와 함께 사용하여 세리프체의 자간을 타이트하게 유지
- 긴 텍스트(2줄 이상)에는 사용하지 않음 — display 폰트는 짧고 임팩트 있는 텍스트에 적합

---

## 4. 컴포넌트 스타일

### 4.1 Button

shadcn/ui Button 기본 variant에 디자인 토큰이 자동 적용된다.

| Variant | 용도 | 스타일 |
|---------|------|--------|
| `default` | 주요 CTA (등록, 검색, 저장) | 앰버 배경 + 크림 텍스트 |
| `secondary` | 보조 액션 (취소, 뒤로) | 따뜻한 라이트 그레이 배경 |
| `outline` | 3차 액션 (필터, 토글) | 따뜻한 보더 + 투명 배경 |
| `ghost` | 최소 액션 (아이콘 버튼, 드롭다운 항목) | 호버 시 앰버 틴트 배경 |
| `destructive` | 삭제, 위험 액션 | 레드 배경 |
| `link` | 인라인 링크 스타일 버튼 | 앰버 텍스트 + 밑줄 |

**크기 가이드:**
- `default` (h-9): 일반 버튼
- `sm` (h-8): 카드 내 보조 버튼, 필터 칩
- `lg` (h-10): 히어로 CTA, 폼 제출 버튼
- `icon` (h-9 w-9): 아이콘 전용 (북마크, 닫기)

### 4.2 Card

| 요소 | 스타일 |
|------|--------|
| 카드 배경 | `bg-card` (미세하게 따뜻한 톤) |
| 카드 테두리 | `border border-border` (라이트: 따뜻한 그레이, 다크: 미묘한 화이트 12%) |
| 카드 라운드 | `rounded-lg` (8px) |
| 카드 그림자 | 기본: `shadow-none`, 호버: `shadow-md` (인터랙티브 카드) |
| 카드 패딩 | `p-4 md:p-6` |

**BarCard 변형:**

| 변형 | 용도 | 특징 |
|------|------|------|
| **Standard** | 검색 리스트, 홈 인기 바 | 세로 카드: 사진(aspect-[4/3]) + 이름 + 카테고리 배지 + 가격대 |
| **Compact** | 분할 뷰 리스트, 내 바 목록 | 가로 카드: 좌측 사진(w-24 h-24) + 우측 정보 |
| **Carousel** | 홈 모바일 가로 스크롤, 근처 바 | 좁은 세로 카드(w-[200px]): 사진 + 이름 + 거리/카테고리 |

### 4.3 Badge

상태 및 카테고리 표시에 사용.

| 용도 | 클래스 |
|------|--------|
| 카테고리 | `<Badge variant="secondary">스피크이지</Badge>` |
| 가격대 | `<Badge variant="outline">₩₩</Badge>` |
| 승인됨 | `<Badge className="bg-success/10 text-success border-success/20">승인됨</Badge>` |
| 심사중 | `<Badge className="bg-warning/10 text-warning-foreground border-warning/20">심사중</Badge>` |
| 거절됨 | `<Badge className="bg-destructive/10 text-destructive border-destructive/20">거절됨</Badge>` |
| 영업중 | `<Badge className="bg-success/10 text-success border-success/20">영업중</Badge>` |
| 영업종료 | `<Badge variant="secondary">영업종료</Badge>` |

### 4.4 Input & Form

| 요소 | 스타일 |
|------|--------|
| 입력 필드 | `bg-background border-input` — 따뜻한 보더, 배경과 동일한 바탕 |
| 포커스 상태 | `focus-visible:ring-2 ring-ring` — 앰버 포커스 링 |
| 레이블 | `text-sm font-medium` |
| 설명 텍스트 | `text-sm text-muted-foreground` |
| 에러 메시지 | `text-sm text-destructive` |

### 4.5 배너 (심사 상태용)

UX 설계서(6.3)에 정의된 오너 전용 심사 상태 배너.

| 상태 | 스타일 |
|------|--------|
| PENDING | `bg-warning/15 border border-warning/30 text-warning-foreground rounded-lg p-4` |
| REJECTED | `bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4` |

배너 내부 구조:
```
[아이콘] 메시지 텍스트                                [액션 버튼]
```

### 4.6 Skeleton (로딩)

| 요소 | 스타일 |
|------|--------|
| 스켈레톤 배경 | `bg-muted` — 따뜻한 그레이로 통일 |
| 스켈레톤 애니메이션 | shadcn/ui 기본 pulse 유지 |
| 카드 스켈레톤 | 사진 영역 + 텍스트 라인 2~3개 |
| 텍스트 스켈레톤 | `h-4 w-[200px] rounded` |

---

## 5. 상태 스타일

### 5.1 인터랙티브 상태

| 상태 | 적용 방식 |
|------|-----------|
| **Hover** | 배경색 변경 (`hover:bg-accent`) + 미세한 그림자 (`hover:shadow-md`) |
| **Focus** | 앰버 포커스 링 (`focus-visible:ring-2 ring-ring ring-offset-2`) |
| **Active/Pressed** | 밝기 약간 감소 (`active:brightness-95`) |
| **Disabled** | 50% 투명도 (`opacity-50 pointer-events-none`) |

### 5.2 로딩 상태

| 상황 | 패턴 |
|------|------|
| 페이지 로딩 | 전체 Skeleton UI 표시 |
| 섹션 로딩 | 해당 섹션만 Skeleton |
| 인라인 로딩 (버튼) | 스피너 + 텍스트 비활성화 |
| 데이터 갱신 | `keepPreviousData: true` + 상단 프로그레스 바 (얇은 앰버 바) |
| 지도 로딩 | 지도 영역 위 반투명 스피너 오버레이 |

### 5.3 빈 상태

| 패턴 | 스타일 |
|------|--------|
| 컨테이너 | `flex flex-col items-center justify-center py-16 text-center` |
| 아이콘 | Lucide 아이콘 48x48, `text-muted-foreground/50` |
| 제목 | `text-lg font-medium mt-4` |
| 설명 | `text-sm text-muted-foreground mt-2 max-w-sm` |
| CTA 버튼 | `<Button className="mt-6">` |

### 5.4 에러 상태

| 패턴 | 스타일 |
|------|--------|
| 폼 필드 에러 | 입력 보더 `border-destructive` + 하단 에러 메시지 `text-destructive` |
| 토스트 (에러) | Sonner `richColors` 기본 사용 |
| 섹션 에러 | 에러 바운더리 + "다시 시도" 버튼 |

---

## 6. 스페이싱 & 레이아웃

### 6.1 스페이싱 원칙

Tailwind의 4px 기반 스페이싱 스케일을 사용한다. 커스텀 값을 만들지 않는다.

| 용도 | 값 | Tailwind |
|------|------|----------|
| 인라인 요소 간격 | 4px | `gap-1` |
| 관련 요소 그룹 내 | 8px | `gap-2` |
| 카드 내부 패딩 | 16px (모바일), 24px (데스크톱) | `p-4 md:p-6` |
| 섹션 내 요소 간격 | 16px | `gap-4` |
| 섹션 간 간격 | 32px (모바일), 48px (데스크톱) | `py-8 md:py-12` |
| 페이지 좌우 패딩 | 16px (모바일), 24px (md), 32px (lg) | `px-4 md:px-6 lg:px-8` |
| 페이지 최대 너비 | 1280px | `max-w-7xl mx-auto` |

### 6.2 반응형 브레이크포인트

Tailwind 기본 브레이크포인트를 사용한다.

| 브레이크포인트 | 값 | 주요 레이아웃 변경 |
|--------------|------|-------------------|
| `sm` | 640px | 카드 그리드 2열 |
| `md` | 768px | 필터 사이드바 표시, 카드 패딩 증가 |
| `lg` | 1024px | 바 상세 2/3+1/3 사이드바 레이아웃, 분할 뷰 |
| `xl` | 1280px | 카드 그리드 3열 |

### 6.3 모바일 하단 탭 바

| 속성 | 값 |
|------|------|
| 높이 | `h-16` (64px) |
| 하단 safe area | `pb-safe` (iOS notch 대응) |
| 표시 조건 | `lg:hidden` (모바일/태블릿만) |
| 위치 | `fixed bottom-0 inset-x-0 z-50` |
| 배경 | `bg-background/95 backdrop-blur-md border-t border-border` |
| 활성 탭 색상 | `text-primary` (앰버) |
| 비활성 탭 색상 | `text-muted-foreground` |

**탭 목록:**

| Tab | Label | Icon | Route |
|-----|-------|------|-------|
| Home | Home | `Home` | `/` |
| Search | Search | `Search` | `/search` |
| Directions | Directions | `Navigation` | `/directions` |
| MY | MY | `User` | `/profile` |

> 이전 Map 탭(`/search?view=map`)은 독립 탭에서 제거됨. "지도" 개념 자체는 유지됨 (검색 지도 뷰, 바 상세 미니맵). 제거되는 것은 "Map이라는 독립 탭"과 "바 상세 길안내"뿐.

### 6.4 헤더

| 속성 | 값 |
|------|------|
| 높이 | `h-16` (64px) |
| 위치 | `sticky top-0 z-40` |
| 배경 | `bg-background/95 backdrop-blur-md border-b border-border/50` |
| 로고 폰트 | `font-display text-xl tracking-tight text-primary` |
| 콘텐츠 영역 하단 여백 | 모바일: `pb-16` (탭 바 높이만큼), 데스크톱: `pb-0` |
| 데스크탑 네비게이션 항목 | Home, Search, Directions |

### 6.5 Footer

| 속성 | 값 |
|------|------|
| 표시 조건 | `hidden lg:block` (데스크탑 전용) |
| 핵심 링크 | Home, Search Bars, Directions, Register Bar, Terms, Privacy |

---

## 7. 애니메이션

### 7.1 원칙

- **자연스럽게**: 모든 전환은 사용자의 인지를 돕는 방향으로. 장식적 애니메이션 최소화
- **빠르게**: 인터랙션 피드백은 150-200ms. 콘텐츠 전환은 200-300ms
- **일관되게**: 같은 유형의 전환에는 같은 easing과 duration 적용

### 7.2 Easing & Duration

| 용도 | Duration | Easing | Tailwind |
|------|----------|--------|----------|
| 호버 전환 (색상, 그림자) | 150ms | ease-out | `transition-colors duration-150` |
| 레이아웃 전환 (확장/축소) | 200ms | ease-in-out | `transition-all duration-200` |
| 콘텐츠 진입 (fade in) | 300ms | ease-out | `transition-opacity duration-300` |
| 모달/시트 진입 | 300ms | ease-out | shadcn/ui 기본 사용 |
| 아코디언 확장 | 200ms | ease-in-out | shadcn/ui Accordion 기본 |
| 캐러셀 스냅 | - | - | CSS `scroll-snap-type: x mandatory` |

### 7.3 페이지/섹션 진입 애니메이션

페이지 로딩 시 콘텐츠가 순차적으로 나타나는 stagger 효과. CSS `animation-delay` 사용.

```
섹션 1: delay 0ms    → fade-in + translateY(8px)
섹션 2: delay 75ms   → fade-in + translateY(8px)
섹션 3: delay 150ms  → fade-in + translateY(8px)
```

Tailwind 클래스로 구현:
```html
<section class="animate-in fade-in slide-in-from-bottom-2 duration-300">
<section class="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
<section class="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
```

> `tw-animate-css`가 이미 설치되어 있으므로 `animate-in`, `fade-in`, `slide-in-from-bottom-*` 사용 가능.

### 7.4 카드 호버

인터랙티브 카드(BarCard)에만 적용:

```html
<div class="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
```

### 7.5 스피크이지 UI 전용 애니메이션

홈 페이지 스피크이지 테마 리디자인에서 도입된 커스텀 애니메이션. `globals.css` `@layer utilities`에 정의됨.

| 유틸리티 클래스 | 키프레임 | 설명 |
|----------------|----------|------|
| `animate-flicker` | `flicker` (9s infinite) | 네온 깜빡임 — 히어로 타이틀 amber 강조 텍스트. 92~97% 구간에서 opacity를 0.55/0.3/0.9로 불규칙하게 변화 |
| `animate-blink-cursor` | `blink-cursor` (1s step-end infinite) | 타이핑 커서 깜빡임 — 히어로 자막 끝에 부착 |
| `animate-scroll-pulse` | `scroll-pulse` (2s ease-in-out infinite) | 스크롤 힌트 펄스 — 히어로 하단 "SCROLL" 텍스트. opacity 0.3↔0.8 반복 |
| `text-neon-glow` | - (CSS text-shadow) | 앰버 네온 글로우 효과 — `rgba(232,151,58,...)` 3단계 text-shadow. 어두운 배경 위에서 사용 |
| `section-label-line` | - (CSS `::after`) | 섹션 레이블 우측 trailing 라인 — `display:flex; align-items:center; gap:1rem`. `::after`로 teal 1px 수평선 생성 (oklch 0.76 0.14 175 / 18%) |

```css
/* 사용 예시 */
<span class="text-landing-amber text-neon-glow animate-flicker">숨겨진</span>  /* 히어로 타이틀 강조 */
<span class="animate-blink-cursor inline-block w-[7px] h-3 bg-landing-amber align-middle" />  /* 히어로 자막 커서 */
<span class="animate-scroll-pulse font-mono text-[9px] tracking-[0.3em] text-landing-tan">SCROLL</span>  /* 스크롤 힌트 */
<p class="section-label-line font-mono text-[9px] tracking-[0.42em] uppercase text-landing-teal">CATEGORIES</p>  /* 섹션 레이블 */
```

### 7.7 마커-리스트 연동 하이라이트

검색 분할 뷰에서 마커↔카드 호버 연동 시:

```html
<!-- 하이라이트 활성 상태 -->
<div class="transition-colors duration-150 ring-2 ring-primary/30 bg-accent">
```

### 7.8 스크롤 스냅 (모바일 캐러셀)

모바일 홈의 인기 바/근처 바 가로 스크롤, 검색 지도 하단 캐러셀:

```html
<div class="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
  <div class="snap-center shrink-0 w-[200px]">카드</div>
</div>
```

`scrollbar-hide` 유틸리티 클래스는 `globals.css` `@layer utilities`에 정의됨 (`-webkit-scrollbar: none` + `scrollbar-width: none`).

### 7.9 사용하지 않는 애니메이션

- 페이지 간 전환 애니메이션 (App Router 기본 동작 유지)
- 3D 변환, 회전
- 과도한 parallax 스크롤

---

## 8. shadcn/ui 컴포넌트 활용 가이드

### 8.1 이미 설치된 컴포넌트

현재 설치되어 바로 사용 가능한 컴포넌트:

`Avatar`, `Badge`, `Button`, `Card`, `Carousel`, `Dialog`, `DropdownMenu`, `Form`, `Input`, `Label`, `Pagination`, `Popover`, `RadioGroup`, `Select`, `Separator`, `Sheet`, `Skeleton`, `Switch`, `Table`, `Tabs`, `Textarea`, `ToggleGroup`, `Toggle`, `Tooltip`

### 8.2 Phase 3에서 추가 필요한 컴포넌트

UX 설계서 기반 추가 설치가 필요한 shadcn/ui 컴포넌트:

| 컴포넌트 | 용도 | 설치 명령 |
|----------|------|-----------|
| `Accordion` | 바 상세 모바일 영업시간/메뉴 | `pnpm dlx shadcn@latest add accordion` |
| `Collapsible` | 바 상세 데스크톱 영업시간 펼침 | `pnpm dlx shadcn@latest add collapsible` |

### 8.3 커스텀 컴포넌트 (신규 생성 필요)

shadcn/ui에 없어서 직접 구현해야 하는 컴포넌트:

| 컴포넌트 | 위치 | 설명 |
|----------|------|------|
| `BottomTabBar` | `components/layout/bottom-tab-bar.tsx` | 모바일 하단 탭 바 |
| `StatusBanner` | `components/ui/status-banner.tsx` | 심사 상태 배너 (PENDING/REJECTED) |
| `EmptyState` | `components/ui/empty-state.tsx` | 공통 빈 상태 패턴 |

---

## 9. 아이콘

Lucide React 사용 (shadcn/ui 기본 아이콘 라이브러리).

### 9.1 크기 가이드

| 용도 | 크기 | 클래스 |
|------|------|--------|
| 인라인 (텍스트 옆) | 16px | `h-4 w-4` |
| 버튼 내 | 16px | `h-4 w-4` |
| 독립 아이콘 버튼 | 20px | `h-5 w-5` |
| 빈 상태 일러스트 | 48px | `h-12 w-12` |
| 하단 탭 바 | 24px | `h-6 w-6` |

### 9.2 주요 아이콘 매핑

| 용도 | 아이콘 |
|------|--------|
| 홈 | `Home` |
| 검색 | `Search` |
| 지도 | `Map` |
| 경로 | `Navigation` |
| MY/프로필 | `User` |
| 북마크 (빈) | `Heart` |
| 북마크 (찬) | `Heart` (fill) |
| 영업중 | `Clock` + 초록 dot |
| 수정 | `Pencil` |
| 삭제 | `Trash2` |
| 필터 | `SlidersHorizontal` |
| 정렬 | `ArrowUpDown` |
| 뒤로 | `ChevronLeft` |
| 닫기 | `X` |
| 경고 | `AlertTriangle` |
| 길안내 | `Navigation` |

---

## 10. 구현 시 주의사항

### 10.1 CSS 변수 우선 원칙

- Tailwind 클래스에서 CSS 변수 토큰을 사용한다: `bg-primary`, `text-foreground`, `border-border`
- 하드코딩된 색상값(`#C17817`, `oklch(...)`)을 직접 사용하지 않는다
- 디자인 시스템에 없는 색상이 필요하면 이 문서에 먼저 토큰을 추가한 후 사용한다

### 10.2 다크 모드 대응

- `app/layout.tsx`의 `<html>` 태그에 `className="dark"`를 적용하여 전역 다크 모드를 강제한다. 시스템 테마와 무관하게 항상 다크 모드로 렌더링된다.
- 모든 컬러는 CSS 변수로 정의되어 있으므로, `.dark` 클래스 전환만으로 자동 대응
- 이미지/사진 위의 오버레이 텍스트는 다크 모드에 의존하지 말고 독립적으로 가독성 확보 (예: `bg-black/50` 오버레이)
- 그림자는 다크 모드에서 덜 보이므로, 보더로 카드 구분을 보완
- 홈 페이지는 별도의 `dark` 래퍼 클래스 없이 `bg-[#0a0604] text-[#F0E0C0]`만 적용한다 (루트 레이아웃의 전역 `dark` 클래스가 이미 적용됨). 히어로 섹션은 배경 이미지(`/images/hero-bg.png`, next/image fill, `object-[center_30%]`) 위에 이중 다크 오버레이를 적용한다. CSS 변수 기반 테마 토큰 대신 스피크이지 팔레트 하드코딩 색상(`#F0E0C0`, `#e8973a`, `#9B5E1A`, `#9a8060`, `#3ECFB2`, `#c8b888`, `#080402`)을 직접 사용하여 레퍼런스 디자인을 일관되게 유지한다.
- 일반 페이지/컴포넌트에서는 하드코딩된 Tailwind 색상(`text-gray-500`, `text-blue-600` 등)을 사용하지 않는다. 반드시 시스템 컬러 토큰(`text-muted-foreground`, `text-primary` 등)을 사용한다.

### 10.3 접근성

- 컬러 대비: WCAG AA 기준 (일반 텍스트 4.5:1, 큰 텍스트 3:1) 충족
- `--primary` (앰버)는 밝기가 중간이므로, primary 배경 위에는 반드시 `--primary-foreground` 사용
- 포커스 링은 모든 인터랙티브 요소에 표시 (`outline-ring/50` 기본 적용)
- 색상만으로 상태를 전달하지 않음 — 아이콘 또는 텍스트 라벨 병행

### 10.4 신규 의존성

이 Phase에서 추가된 의존성:

| 패키지 | 사유 |
|--------|------|
| 없음 | `Instrument Serif`는 `next/font/google`로 로드하므로 추가 패키지 불필요 |

---

## 부록: 컬러 참조 시트 (빠른 조회용)

### 라이트 모드 핵심

```
배경    ██ oklch(0.985 0.003 80)   크림 화이트
텍스트  ██ oklch(0.165 0.015 50)   따뜻한 차콜
앰버    ██ oklch(0.62  0.16  55)   리치 앰버 (primary)
보조    ██ oklch(0.50  0.015 50)   미디엄 그레이 (muted-foreground)
보더    ██ oklch(0.91  0.008 70)   라이트 그레이
에러    ██ oklch(0.55  0.235 27)   따뜻한 레드
경고    ██ oklch(0.75  0.15  75)   골든 옐로
성공    ██ oklch(0.62  0.15  155)  틸 그린
```

### 다크 모드 핵심

```
배경    ██ oklch(0.145 0.012 50)   딥 차콜
텍스트  ██ oklch(0.93  0.008 75)   따뜻한 크림
앰버    ██ oklch(0.75  0.15  65)   브라이트 앰버 (primary)
보조    ██ oklch(0.62  0.015 55)   미디엄 그레이 (muted-foreground)
보더    ██ oklch(1 0 0 / 12%)      서틀 화이트
에러    ██ oklch(0.68  0.19  22)   따뜻한 레드
경고    ██ oklch(0.78  0.14  75)   골든 옐로
성공    ██ oklch(0.70  0.14  155)  틸 그린
```
