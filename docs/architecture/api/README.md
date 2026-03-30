# Hidden Bar API 명세서 — 인덱스

> 관련 문서: [시스템 개요](../system-overview.md), [DB 구조](../database.md), [프론트엔드 구조](../frontend-overview.md), [문서 안내](../../README.md)
> 이 문서는 현재 구현된 API 계약의 정본이다.
> 리뷰 API는 v1 범위의 정식 기능으로 취급한다.

> 최종 갱신일: 2026-03-22
> Base URL: `/api/v1`
> 총 엔드포인트 수: **52개** (비즈니스 51개 + 인프라 1개)

---

## 파일 목록

| 파일 | 설명 | 엔드포인트 수 |
|------|------|--------------|
| [common.md](./common.md) | 공통 규칙 (인증, 응답 구조, 에러, 상태 코드) + 전체 엔드포인트 요약 테이블 + 헬스 체크 | 1 (인프라) |
| [auth.md](./auth.md) | 회원가입, 로그인, OAuth, 이메일 인증, 비밀번호 재설정 (SPEC-01) | 8 |
| [users.md](./users.md) | 프로필 조회/수정, 비밀번호 변경, 프로필 이미지 (SPEC-01) | 4 |
| [bars.md](./bars.md) | 가게 CRUD, 사진, 근처 바 검색 (SPEC-02 + SPEC-04 nearby) | 8 |
| [bookmarks.md](./bookmarks.md) | 북마크 추가/제거/목록 (SPEC-02) | 3 |
| [search.md](./search.md) | 바 검색 (SPEC-03) | 1 |
| [maps.md](./maps.md) | 길안내, 주소 검색 (SPEC-04) | 2 |
| [admin.md](./admin.md) | 관리자 대시보드, 가게/유저/리뷰 관리, 감사 로그 (SPEC-05) | 14 |
| [reviews.md](./reviews.md) | 리뷰 CRUD, 리뷰 사진 (SPEC-06) | 7 |
| [review-reports.md](./review-reports.md) | 리뷰 신고 접수/조회/처리 (SPEC-07) | 4 |
