# 데이터베이스 설계 문서

> 관련 문서: [시스템 개요](../system-overview.md) · [API 명세](../api.md) · [문서 안내](../../README.md)
> 이 문서는 현재 구현된 DB 구조의 정본이다.
> 리뷰 관련 테이블은 v1 범위의 정식 기능으로 취급한다.
> DB 정책은 개발 환경에서 `synchronize`와 `dropSchema`를 허용하고, 프로덕션에서는 마이그레이션만 사용한다.

> 최종 수정일: 2026-03-20
> 대상 DBMS: PostgreSQL
> ORM: TypeORM (NestJS)

---

## 목차

| 파일 | 설명 |
|------|------|
| [setup.md](./setup.md) | 데이터베이스 초기 설정 (PostgreSQL 실행, 연결, 스키마 생성) 및 마이그레이션 관리 |
| [erd.md](./erd.md) | 전체 ERD (Mermaid 다이어그램) 및 테이블 간 관계 요약 |
| [enums.md](./enums.md) | Enum 정의 일람 (Role, AuthProvider, BarStatus 등 14개) |
| [shared-policies.md](./shared-policies.md) | Soft Delete 정책 (적용 범위, Cascade, TypeORM Subscriber) |
| [auth.md](./auth.md) | 인증 관련 테이블 (users, accounts, refresh_tokens, email_verifications) |
| [bars.md](./bars.md) | 바 관련 테이블 (bars, bar_photos, menu_items, operating_hours) |
| [bookmarks.md](./bookmarks.md) | 북마크 테이블 (bookmarks) |
| [reviews.md](./reviews.md) | 리뷰 관련 테이블 (reviews, review_photos, bar_review_stats) |
| [review-reports.md](./review-reports.md) | 리뷰 신고 테이블 (review_reports) |
| [admin.md](./admin.md) | 관리자 관련 테이블 (admin_actions) |
