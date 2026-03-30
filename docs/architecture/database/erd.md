# 전체 ERD 및 테이블 관계

> 관련 문서: [README](./README.md) · [Enum 정의](./enums.md) · [Soft Delete 정책](./shared-policies.md)

---

## 1. 전체 ERD

```mermaid
erDiagram
    users ||--o{ accounts : "has"
    users ||--o{ refresh_tokens : "has"
    users ||--o{ bars : "owns"
    users ||--o{ bookmarks : "has"
    users ||--o{ admin_actions : "performs"
    users ||--o{ reviews : "writes"
    users ||--o{ review_reports : "reports"

    reviews ||--o{ review_reports : "has"

    bars ||--o{ bar_photos : "has"
    bars ||--o{ menu_items : "has"
    bars ||--o{ operating_hours : "has"
    bars ||--o{ bookmarks : "has"
    bars ||--o{ reviews : "has"
    bars ||--|| bar_review_stats : "has"

    email_verifications {
        int id PK "autoincrement"
        string email "varchar(255)"
        string codeHash "varchar(255)"
        EmailVerificationPurpose purpose
        datetime expiresAt
        boolean isUsed "default: false"
        int failCount "default: 0"
        datetime createdAt
    }

    users {
        int id PK "autoincrement"
        string email UK "varchar(255)"
        string passwordHash "nullable"
        string name "varchar(30)"
        string profileImage "nullable"
        Role role "default: USER"
        boolean isActive "default: true"
        datetime createdAt
        datetime updatedAt
        datetime deletedAt "nullable"
    }

    accounts {
        int id PK "autoincrement"
        int userId FK
        AuthProvider provider
        string providerAccountId
        datetime createdAt
        datetime deletedAt "nullable"
    }

    refresh_tokens {
        int id PK "autoincrement"
        string token UK
        int userId
        datetime expiresAt
        datetime createdAt
        datetime deletedAt "nullable"
    }

    bars {
        int id PK "autoincrement"
        string name "varchar(100)"
        string description "text, nullable"
        string address "varchar(255)"
        string city "varchar(50)"
        string country "varchar(50)"
        float latitude
        float longitude
        geography location "Point 4326, nullable"
        string phone "varchar(30), nullable"
        string website "varchar(255), nullable"
        BarStatus status "default: PENDING"
        int ownerId FK
        tsvector searchVector "nullable"
        datetime createdAt
        datetime updatedAt
        datetime deletedAt "nullable"
    }

    bar_photos {
        int id PK "autoincrement"
        string url "varchar(500)"
        int order "default: 0"
        int barId FK
        datetime createdAt
        datetime deletedAt "nullable"
    }

    menu_items {
        int id PK "autoincrement"
        string name "varchar(100)"
        string description "varchar(255), nullable"
        float price
        string currency "varchar(3), default: USD"
        int barId FK
        datetime createdAt
        datetime deletedAt "nullable"
    }

    operating_hours {
        int id PK "autoincrement"
        DayOfWeek dayOfWeek
        string openTime "varchar(5)"
        string closeTime "varchar(5)"
        boolean isClosed "default: false"
        int barId FK
        datetime deletedAt "nullable"
    }

    bookmarks {
        int id PK "autoincrement"
        int userId FK
        int barId FK
        datetime createdAt
        datetime deletedAt "nullable"
    }

    admin_actions {
        int id PK "autoincrement"
        AdminActionType actionType
        string targetType "varchar(20)"
        int targetId
        string reason "text, nullable"
        jsonb metadata "nullable"
        int adminId FK
        datetime createdAt
    }

    reviews {
        int id PK "autoincrement"
        int userId FK
        int barId FK
        smallint rating "1~5"
        text content
        date visitedAt "nullable"
        ReviewStatus status "default: PUBLISHED"
        int photoCount "default: 0"
        int helpfulCount "default: 0"
        datetime createdAt
        datetime updatedAt
        datetime deletedAt "nullable"
    }

    review_photos {
        int id PK "autoincrement"
        int reviewId FK
        string url "varchar(500)"
        string s3Key "varchar(500)"
        string mimeType "varchar(100), nullable"
        int sizeBytes "nullable"
        int width "nullable"
        int height "nullable"
        int sortOrder "default: 0"
        datetime createdAt
        datetime deletedAt "nullable"
    }

    bar_review_stats {
        int barId PK FK
        int reviewCount "default: 0"
        numeric ratingAvg "precision 3 scale 2, default: 0"
        int rating1Count "default: 0"
        int rating2Count "default: 0"
        int rating3Count "default: 0"
        int rating4Count "default: 0"
        int rating5Count "default: 0"
        int ratingSum "default: 0"
        int photoReviewCount "default: 0"
        datetime updatedAt
    }

    review_reports {
        int id PK "autoincrement"
        int reviewId FK
        int reporterUserId FK
        ReportReason reason
        text detail "nullable"
        ReportStatus status "default: PENDING"
        ReportResolution resolution "nullable"
        text resolutionNote "nullable"
        int processedByAdminId FK "nullable"
        datetime processedAt "nullable"
        datetime createdAt
        datetime updatedAt
    }
```

---

## 2. 테이블 간 관계 요약

모든 외래 키(FK) 관계와 cascade 규칙을 아래 표에 정리한다.

| 소스 테이블 | FK 컬럼 | 대상 테이블 | 관계 타입 | ON DELETE | 설명 |
|------------|---------|------------|-----------|-----------|------|
| accounts | userId | users | ManyToOne | CASCADE (soft) | 유저 soft delete 시 연동 계정도 cascade soft delete |
| refresh_tokens | userId | users | ManyToOne | CASCADE (soft) | 유저 soft delete 시 토큰도 cascade soft delete |
| bars | ownerId | users | ManyToOne | CASCADE (soft) | 등록자 참조 |
| bar_photos | barId | bars | ManyToOne | CASCADE (soft) | 가게 soft delete 시 사진도 cascade soft delete |
| menu_items | barId | bars | ManyToOne | CASCADE (soft) | 가게 soft delete 시 메뉴도 cascade soft delete |
| operating_hours | barId | bars | ManyToOne | CASCADE (soft) | 가게 soft delete 시 영업시간도 cascade soft delete |
| bookmarks | userId | users | ManyToOne | CASCADE (soft) | 유저 soft delete 시 북마크도 cascade soft delete |
| bookmarks | barId | bars | ManyToOne | CASCADE (soft) | 가게 soft delete 시 북마크도 cascade soft delete |
| admin_actions | adminId | users | ManyToOne | RESTRICT (기본) | 관리자 참조 (감사 로그 보존) |
| reviews | userId | users | ManyToOne | CASCADE | 유저 삭제 시 리뷰도 cascade delete |
| reviews | barId | bars | ManyToOne | CASCADE | 가게 삭제 시 리뷰도 cascade delete |
| review_photos | reviewId | reviews | ManyToOne | CASCADE | 리뷰 삭제 시 사진도 cascade delete |
| bar_review_stats | barId | bars | OneToOne | CASCADE | 가게와 1:1 통계 레코드 |
| review_reports | reviewId | reviews | ManyToOne | CASCADE | 리뷰 삭제 시 신고도 cascade delete |
| review_reports | reporterUserId | users | ManyToOne | CASCADE | 유저 삭제 시 신고도 cascade delete |
| review_reports | processedByAdminId | users | ManyToOne | SET NULL | 관리자 삭제 시 null 처리 |

### 관계 다이어그램 요약

```
users (1) ──── (N) accounts         : 유저 ↔ OAuth 연동 계정
users (1) ──── (N) refresh_tokens   : 유저 ↔ 리프레시 토큰
users (1) ──── (N) bars             : 유저 ↔ 등록한 가게
users (1) ──── (N) bookmarks        : 유저 ↔ 북마크
users (1) ──── (N) admin_actions    : 관리자 ↔ 감사 로그

bars (1) ──── (N) bar_photos        : 가게 ↔ 사진
bars (1) ──── (N) menu_items        : 가게 ↔ 메뉴
bars (1) ──── (N) operating_hours   : 가게 ↔ 영업시간
bars (1) ──── (N) bookmarks         : 가게 ↔ 북마크
bars (1) ──── (N) reviews           : 가게 ↔ 리뷰
bars (1) ──── (1) bar_review_stats  : 가게 ↔ 리뷰 통계

users (1) ──── (N) reviews          : 유저 ↔ 작성 리뷰

reviews (1) ──── (N) review_photos  : 리뷰 ↔ 사진
```
