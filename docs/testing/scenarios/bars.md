# 바 CRUD & 라이프사이클 E2E 시나리오

## 백엔드 API E2E

### 바 등록 (`POST /api/v1/bars`)


| #   | 시나리오                                                                 | 기대 결과                 | 기존 커버 |
| --- | -------------------------------------------------------------------- | --------------------- | ----- |
| 1   | 필수 필드만으로 생성 (name, address, city, country, latitude, longitude)      | 201 + status: PENDING | ✅     |
| 2   | 모든 선택 필드 포함 (description, phone, website, menuItems, operatingHours) | 201 + 전체 필드 반환        | ✅     |
| 3   | 필수 필드(name) 누락                                                       | 400 Bad Request       | ✅     |
| 4   | 유효하지 않은 좌표 (latitude > 90)                                           | 400 Bad Request       | ✅     |
| 5   | 유효하지 않은 좌표 (longitude > 180)                                         | 400 Bad Request       | ✅     |
| 6   | 미인증 요청                                                               | 401 Unauthorized      | ✅     |
| 7   | 메뉴 아이템: name 빈 값                                                     | 400 Bad Request       | ✅     |
| 8   | 메뉴 아이템: price 음수                                                     | 400 Bad Request       | ✅     |
| 9   | 영업시간: 유효하지 않은 요일                                                     | 400 Bad Request       | ✅     |
| 10  | 영업시간: 유효하지 않은 시간 형식                                                  | 400 Bad Request       | ✅     |


### 바 조회 (`GET /api/v1/bars/:id`)


| #   | 시나리오                   | 기대 결과                                                           | 기존 커버 |
| --- | ---------------------- | --------------------------------------------------------------- | ----- |
| 1   | APPROVED 바 상세 조회 (미인증) | 401 Unauthorized                                                | ✅     |
| 2   | APPROVED 바 상세 조회 (인증)  | 200 + 바 정보 (photos, menuItems, operatingHours, isBookmarked 포함) | ✅     |
| 3   | PENDING 바: 미인증 유저      | 401 Unauthorized                                                | ✅     |
| 4   | PENDING 바: 다른 유저       | 404 Not Found                                                   | ✅     |
| 5   | PENDING 바: 소유자         | 200 + 바 정보                                                      | ✅     |
| 6   | PENDING 바: 관리자         | 200 + 바 정보                                                      | ✅     |
| 7   | 존재하지 않는 바 ID           | 404 Not Found                                                   | ✅     |
| 8   | 소프트 삭제된 바              | 404 Not Found                                                   | ✅     |


### 바 수정 (`PATCH /api/v1/bars/:id`)


| #   | 시나리오                               | 기대 결과                          | 기존 커버 |
| --- | ---------------------------------- | ------------------------------ | ----- |
| 1   | 소유자가 이름 수정                         | 200 + 이름 변경 + status → PENDING | ✅     |
| 2   | 비소유자 수정 시도                         | 403 Forbidden                  | ✅     |
| 3   | 존재하지 않는 바                          | 404 Not Found                  | ✅     |
| 4   | 미인증 요청                             | 401 Unauthorized               | ✅     |
| 5   | 부분 수정 시 나머지 필드 보존 확인               | 200 + 미수정 필드 원본 유지             | ✅     |
| 6   | 메뉴 아이템 교체: 새 배열 전달 → 기존 삭제 + 새로 생성 | 200 + 새 메뉴만 존재                 | ✅     |
| 7   | 영업시간 교체: 새 배열 전달 → 기존 삭제 + 새로 생성   | 200 + 새 영업시간만 존재               | ✅     |
| 8   | 유효하지 않은 필드 값 (예: latitude 200)     | 400 Bad Request                | ✅     |


### 바 삭제 (`DELETE /api/v1/bars/:id`)


| #   | 시나리오         | 기대 결과            | 기존 커버 |
| --- | ------------ | ---------------- | ----- |
| 1   | 소유자 소프트 삭제   | 204 No Content   | ✅     |
| 2   | 비소유자 삭제 시도   | 403 Forbidden    | ✅     |
| 3   | 존재하지 않는 바    | 404 Not Found    | ✅     |
| 4   | 미인증 요청       | 401 Unauthorized | ✅     |
| 5   | 삭제된 바 재삭제 시도 | 404 Not Found    | ✅     |


### 내 바 목록 (`GET /api/v1/bars/my`)


| #   | 시나리오                      | 기대 결과                             | 기존 커버 |
| --- | ------------------------- | --------------------------------- | ----- |
| 1   | 소유 바 목록 반환                | 200 + items 배열 + meta             | ✅     |
| 2   | 상태 필터: `?status=PENDING`  | PENDING 바만 반환                     | ✅     |
| 3   | 상태 필터: `?status=APPROVED` | APPROVED 바만 반환                    | ✅     |
| 4   | 상태 필터: `?status=REJECTED` | REJECTED 바만 반환                    | ✅     |
| 5   | 페이지네이션: `?page=1&limit=5` | 올바른 meta (totalItems, totalPages) | ✅     |
| 6   | 미인증 요청                    | 401 Unauthorized                  | ✅     |
| 7   | 바가 없는 유저                  | 200 + items: [] + meta            | ✅     |


### 사진 업로드 (`POST /api/v1/bars/:id/photos`)


| #   | 시나리오                | 기대 결과                   | 기존 커버 |
| --- | ------------------- | ----------------------- | ----- |
| 1   | 단일 JPEG 파일 업로드      | 201 + photo 정보 (url 포함) | ✅     |
| 2   | 다중 파일 업로드 (3장)      | 201 + photos 배열         | ✅     |
| 3   | 5장 초과 업로드           | 400 Bad Request         | ✅     |
| 4   | 유효하지 않은 파일 타입 (txt) | 400 Bad Request         | ✅     |
| 5   | 파일 크기 초과 (>5MB)     | 413 Payload Too Large   | ✅     |
| 6   | 비소유자 업로드 시도         | 403 Forbidden           | ✅     |
| 7   | 미인증 요청              | 401 Unauthorized        | ✅     |
| 8   | 존재하지 않는 바           | 404 Not Found           | ✅     |


### 사진 삭제 (`DELETE /api/v1/bars/:id/photos/:photoId`)


| #   | 시나리오          | 기대 결과            | 기존 커버 |
| --- | ------------- | ---------------- | ----- |
| 1   | 소유자 사진 삭제     | 204 No Content   | ✅     |
| 2   | 비소유자 삭제 시도    | 403 Forbidden    | ✅     |
| 3   | 존재하지 않는 사진 ID | 404 Not Found    | ✅     |
| 4   | 미인증 요청        | 401 Unauthorized | ✅     |


---

## 프론트엔드 브라우저 E2E

### 바 등록 위자드 (`/bars/new`)


| #   | 시나리오            | 검증 항목                                                     |
| --- | --------------- | --------------------------------------------------------- |
| 1   | Step 1 렌더링      | `bar-form-step-1` 활성, `bar-form-name-input` 노출            |
| 2   | Step 1 유효성      | 이름 없이 `bar-form-next-button` 클릭 → 인라인 에러                  |
| 3   | Step 1 → Step 2 | 필수 필드 입력 후 다음 → `bar-form-step-2` 활성                      |
| 4   | Step 2 주소 검색    | 주소 입력 → 자동완성 결과 선택 → city/country/lat/lng 자동 채움           |
| 5   | Step 2 지도 확인    | 선택한 좌표에 마커 표시                                             |
| 6   | Step 2 → Step 3 | 다음 → `bar-form-step-3` 활성                                 |
| 7   | Step 3 사진 업로드   | `photo-uploader` 클릭/드래그 → `photo-uploader-preview-0` 미리보기 |
| 8   | Step 3 → Step 4 | 다음 → `bar-form-step-4` 활성                                 |
| 9   | Step 4 메뉴 추가    | `menu-editor-add` 클릭 → `menu-item-0` 생성 → 이름/가격 입력        |
| 10  | Step 4 → Step 5 | 다음 → `bar-form-step-5` 활성                                 |
| 10a | Step 5 영업시간 설정  | `operating-hours-mon` 등 요일별 설정                             |
| 11  | 제출 성공           | `bar-form-submit-button` 클릭 → `/my-bars`로 이동 + 성공 토스트     |
| 12  | 이전 버튼           | `bar-form-prev-button` 클릭 → 이전 스텝으로 이동 + 입력값 유지           |
| 13  | 미인증 접근          | `/bars/new` → `/login` 리다이렉트                              |


### 바 상세 페이지 (`/bars/[id]`)


| #   | 시나리오     | 검증 항목                                                   |
| --- | -------- | ------------------------------------------------------- |
| 1   | 기본 정보 표시 | `bar-detail-name`, 설명, 주소 노출                            |
| 2   | 사진 갤러리   | 사진 캐러셀/그리드 렌더링                                          |
| 3   | 메뉴 표시    | 메뉴 아이템 테이블 (이름, 설명, 가격)                                 |
| 4   | 영업시간 표시  | 요일별 영업시간 테이블                                            |
| 5   | 북마크 버튼   | `bar-card-bookmark-{barId}` 클릭 → 채워짐 + 카운트 변경            |
| 6   | 소유자 뷰    | `bar-detail-edit-button`, `bar-detail-delete-button` 노출 |
| 7   | 비소유자 뷰   | 수정/삭제 버튼 미노출                                            |
| 8   | 지도       | 바 위치 마커 표시                                              |


### 바 수정 (`/bars/[id]/edit`)


| #   | 시나리오       | 검증 항목                              |
| --- | ---------- | ---------------------------------- |
| 1   | 기존 데이터 로드  | 폼에 기존 이름/설명/주소 등 채워짐               |
| 2   | 필드 수정 → 제출 | 이름 변경 → 저장 → 상세 페이지에 반영            |
| 3   | 상태 변경      | 수정 후 상태 PENDING으로 변경 확인            |
| 4   | 비소유자 접근    | `/bars/[id]/edit` → 403 토스트 + 뒤로가기 |


### 바 삭제


| #   | 시나리오  | 검증 항목                      |
| --- | ----- | -------------------------- |
| 1   | 삭제 클릭 | 확인 다이얼로그 표시                |
| 2   | 확인    | `/my-bars`로 이동 + 삭제된 바 미노출 |
| 3   | 취소    | 다이얼로그 닫힘 + 상세 페이지 유지       |


### 내 바 목록 (`/my-bars`)


| #   | 시나리오    | 검증 항목                                                       |
| --- | ------- | ----------------------------------------------------------- |
| 1   | 목록 렌더링  | `my-bars-card-{id}` 카드 표시                                   |
| 2   | 상태 탭 필터 | `my-bars-status-tab-ALL/PENDING/APPROVED/REJECTED` 클릭 → 필터링 |
| 3   | 카드 클릭   | 바 상세 페이지로 이동                                                |
| 4   | 빈 목록    | 등록된 바 없을 때 빈 상태 UI                                          |
| 5   | 페이지네이션  | 다음 페이지 클릭 → 새 카드 표시                                         |


### 사진 관리


| #   | 시나리오         | 검증 항목             |
| --- | ------------ | ----------------- |
| 1   | 드래그 앤 드롭 업로드 | 파일 드래그 → 미리보기 표시  |
| 2   | 클릭 업로드       | 파일 선택 → 미리보기 표시   |
| 3   | 사진 삭제        | 미리보기 X 버튼 → 사진 제거 |
| 4   | 업로드 진행률      | 프로그레스 바 표시        |


### BarForm 멀티스텝 폼 — 조기 submit 버그 회귀 방지 (프론트엔드 컴포넌트)

> 테스트 파일: `frontend/src/components/bars/__tests__/bar-form.test.tsx`


| #   | 시나리오                                  | 기대 결과                            | 상태  |
| --- | ------------------------------------- | -------------------------------- | --- |
| 1   | step 1에서 HTMLInputElement에 Enter 키 입력 | createBar 미호출                    | ✅   |
| 2   | step 2에서 HTMLInputElement에 Enter 키 입력 | createBar 미호출                    | ✅   |
| 3   | step 4에서 submit 버튼 클릭                 | createBar 정상 호출                  | ✅   |
| 4   | step 1에서 div 요소에 Enter 키 입력           | createBar 미호출 (form submit 미발생)  | ✅   |
| 5   | step 3(photos)에서 Enter 키 입력           | createBar 미호출                    | ✅   |
| 6   | step 4에서 div 요소에 Enter 키 입력           | createBar 미호출 (submit은 버튼 클릭으로만) | ✅   |


