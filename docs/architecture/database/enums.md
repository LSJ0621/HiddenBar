# Enum 정의 일람

> 관련 문서: [README](./README.md) · [ERD](./erd.md)

---

## 1. Enum 정의 일람

프로젝트에서 사용하는 모든 PostgreSQL enum 타입을 아래에 정리한다. TypeORM에서는 `enum` 타입 컬럼으로 매핑된다.

### 1.1 Role

사용자 역할을 구분한다.

```typescript
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
```

### 1.2 AuthProvider

OAuth 연동 제공자를 구분한다.

```typescript
export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
}
```

### 1.3 BarStatus

가게(술집) 등록 상태를 나타낸다.

```typescript
export enum BarStatus {
  PENDING = 'PENDING',     // 등록 후 승인 대기
  APPROVED = 'APPROVED',   // 관리자 승인 완료
  REJECTED = 'REJECTED',   // 관리자 거절
}
```

### 1.4 DayOfWeek

영업시간 설정에 사용되는 요일 구분이다.

```typescript
export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}
```

### 1.5 AdminActionType

관리자 감사 로그에 기록되는 액션 타입이다.

```typescript
export enum AdminActionType {
  BAR_APPROVED = 'BAR_APPROVED',
  BAR_REJECTED = 'BAR_REJECTED',
  BAR_DELETED = 'BAR_DELETED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  REVIEW_HIDDEN = 'REVIEW_HIDDEN',
  REVIEW_RESTORED = 'REVIEW_RESTORED',
  REVIEW_DELETED = 'REVIEW_DELETED',
}
```

### 1.6 SearchSortBy

검색 결과 정렬 기준이다.

```typescript
export enum SearchSortBy {
  RELEVANCE = 'relevance',   // similarity() 기반 퍼지 매칭 (좌표 있을 때), 일반 목록 모드에서는 NEWEST와 동일하게 createdAt DESC로 폴백
  NEWEST = 'newest',         // createdAt DESC
  BOOKMARKS = 'bookmarks',   // 북마크 수 DESC
}
```

### 1.7 TravelMode

지도 길안내 이동 수단이다. (SPEC-04 참조)

```typescript
export enum TravelMode {
  DRIVING = 'DRIVING',
  WALKING = 'WALKING',
  TRANSIT = 'TRANSIT',
}
```

### 1.8 AdminBarsSortBy

관리자 가게 목록 정렬 기준이다.

```typescript
export enum AdminBarsSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME = 'name',
}
```

### 1.9 ReviewStatus

리뷰의 노출 상태를 나타낸다.

```typescript
export enum ReviewStatus {
  PUBLISHED = 'PUBLISHED',   // 공개 상태 (기본값)
  HIDDEN = 'HIDDEN',         // 관리자에 의해 숨김 처리
  REPORTED = 'REPORTED',     // 관리자가 추가 확인이 필요하다고 표시한 moderation 상태
}
```

### 1.10 EmailVerificationPurpose

이메일 인증 코드의 용도를 구분한다.

> **참고**: 이 enum은 다른 공유 enum과 달리 `packages/shared/src/enums/`가 아닌 `backend/src/auth/constants/email-verification.constants.ts`에 정의되어 있다.

```typescript
export enum EmailVerificationPurpose {
  SIGNUP = 'SIGNUP',
  RESET_PASSWORD = 'RESET_PASSWORD',
}
```

### 1.11 ReportReason

리뷰 신고 사유이다.

```typescript
export enum ReportReason {
  SPAM = 'SPAM',
  ABUSIVE_OR_HATEFUL = 'ABUSIVE_OR_HATEFUL',
  SEXUAL_OR_OBSCENE = 'SEXUAL_OR_OBSCENE',
  MISINFORMATION = 'MISINFORMATION',
  OTHER = 'OTHER',
}
```

### 1.12 ReportStatus

리뷰 신고 처리 상태이다.

```typescript
export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}
```

### 1.13 ReportResolution

관리자의 신고 처리 결정이다.

```typescript
export enum ReportResolution {
  RESTORED = 'RESTORED',
  HIDDEN = 'HIDDEN',
  DELETED = 'DELETED',
}
```
