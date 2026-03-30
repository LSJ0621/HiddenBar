# 지도 & 길안내 E2E 시나리오

## 백엔드 API E2E

인증 전제: 지도/길안내/주소 검색 API는 로그인한 사용자 기준으로 검증한다.

### 근처 바 (`GET /api/v1/bars/nearby`)


| #   | 시나리오                      | 기대 결과                               | 커버  |
| --- | ------------------------- | ----------------------------------- | --- |
| 1   | 미인증 요청                    | 401 Unauthorized                    | ✅   |
| 2   | 유효 좌표 + 기본 반경 (5km)       | 200 + 거리순 정렬 + 각 바에 `distanceKm` 포함 | ✅   |
| 3   | 유효 좌표 + 사용자 지정 반경 (10km)  | 200 + 10km 내 바 반환                   | ✅   |
| 4   | 유효 좌표 + 작은 반경 (0.1km)     | 200 + 범위 내 바만 반환 (빈 배열 가능)          | ✅   |
| 5   | 유효하지 않은 좌표: latitude > 90 | 400 Bad Request                     | ✅   |
| 6   | 필수 파라미터 누락 (latitude 없음)  | 400 Bad Request                     | ✅   |
| 7   | APPROVED 바만 반환 확인         | PENDING/REJECTED 바 미포함              | ✅   |
| 8   | distanceKm 정확성            | 반환된 거리가 실제 좌표 간 거리와 근사 일치           | ✅   |
| 9   | 정렬 확인                     | distanceKm ASC (가까운 바 우선)           | ✅   |


### 길안내 (`GET /api/v1/maps/directions`)


| #   | 시나리오                        | 기대 결과                                                   | 커버  |
| --- | --------------------------- | ------------------------------------------------------- | --- |
| 1   | 미인증 요청                      | 401 Unauthorized                                        | ✅   |
| 2   | WALKING 모드: 유효 출발/도착        | 200 + routes[].steps[] + distance + duration + polyline | ✅   |
| 3   | TRANSIT 모드: 유효 출발/도착        | 200 + 대중교통 세부정보 (lineName, vehicleType, stopCount)      | ✅   |
| 4   | TRANSIT 모드: 최대 3개 대안 경로     | routes 배열 최대 3개                                         | ✅   |
| 5   | TRANSIT 모드: 연속 도보 구간 병합     | 인접 WALK steps 하나로 병합                                    | ✅   |
| 6   | DRIVING 모드: 유효 출발/도착        | 200 + 단일 경로 반환                                          | ✅   |
| 7   | 유효하지 않은 출발 좌표 (lat > 90)    | 400 Bad Request                                         | ✅   |
| 8   | 경로를 찾을 수 없는 좌표 쌍            | 404 Not Found (ZERO_RESULTS)                            | ✅   |
| 9   | 유효하지 않은 mode (예: `BICYCLE`) | 400 Bad Request                                         | ✅   |


### 주소 검색 (`GET /api/v1/maps/address/search`)


| #   | 시나리오             | 기대 결과                                                               | 커버  |
| --- | ---------------- | ------------------------------------------------------------------- | --- |
| 1   | 미인증 요청           | 401 Unauthorized                                                    | ✅   |
| 2   | 유효 쿼리 (예: `강남역`) | 200 + results[]{displayName, formattedAddress, latitude, longitude} | ✅   |
| 3   | 빈 쿼리 (`?query=`) | 400 Bad Request                                                     | ✅   |
| 4   | 쿼리 파라미터 누락       | 400 Bad Request                                                     | ✅   |
| 5   | 결과 없는 쿼리         | 200 + results: []                                                   | ✅   |


### 속도 제한


| #   | 시나리오                     | 기대 결과                 | 커버  |
| --- | ------------------------ | --------------------- | --- |
| 1   | 길안내 API 10회 연속 요청        | 200 (모두 성공)           | ✅   |
| 2   | 길안내 API 11번째 요청 (1분 내)   | 429 Too Many Requests | ✅   |
| 3   | 주소 검색 API 11번째 요청 (1분 내) | 429 Too Many Requests | ✅   |
| 4   | 근처 바 API 11번째 요청 (1분 내)  | 429 Too Many Requests | ✅   |


---

## 프론트엔드 브라우저 E2E

### 바 상세 사이드바

> 바 상세 사이드바에는 미니맵, Directions 버튼, Contact 카드, 관련 바 목록이 표시된다. Directions 버튼 클릭 시 DirectionsSheet가 열린다.


| #   | 시나리오             | 검증 항목                                   |
| --- | ---------------- | --------------------------------------- |
| 1   | 미인증 바 상세 접근      | `/login` 리다이렉트                          |
| 2   | 지도 렌더링           | `map-view` 노출 + 바 위치에 마커 표시             |
| 3   | Directions 버튼    | "Directions" 버튼 클릭 → DirectionsSheet 열림 |
| 4   | 관련 바 목록          | `related-bars-list` 영역 노출               |
| 5   | Google Maps API 키 미설정 시 | `map-fallback` 표시 (위도/경도 텍스트). API 키 존재 + 스크립트 로드 실패 시에는 로딩 스피너 유지. E2E는 graceful degradation만 확인. |


### DirectionsSheet (바 상세 → 길안내 미리보기)

> "Directions" 버튼 클릭 시 Sheet가 열리며, Sheet 내부에서 `useDirections` 훅이 즉시 호출되어 경로 미리보기를 제공한다. Sheet 안의 "Get Directions" 버튼(Button, 링크 아님) 클릭 시 `sessionStorage`에 바 정보를 저장하고 `/directions`로 이동한다.


| #   | 시나리오                | 검증 항목                                                                                       | 기존 커버 |
| --- | ------------------- | ------------------------------------------------------------------------------------------- | ----- |
| 1   | Sheet 열림 + API 호출   | "Directions" 버튼 클릭 → Sheet 열림 + directions API 호출 (mock 필요) + 경로 미리보기 표시                    | ✅     |
| 2   | Sheet 내 이동 수단 변경    | Walking/Transit/Driving 전환 시 경로 갱신 (API 재호출)                                                | ✅     |
| 3   | "Get Directions" 클릭 | Sheet 내 "Get Directions" 버튼 클릭 → `sessionStorage.setItem('directions-bar', ...)` + `/directions` 이동 | ✅     |
| 4   | Sheet 닫기            | Sheet 외부 클릭 또는 닫기 → Sheet 닫힘, 바 상세 페이지 유지                                                   | ✅     |


### 경로 탭 길안내 (`/directions`)

> 길안내는 경로 탭에서 제공된다. UI 기본 이동 수단은 TRANSIT (API 기본값 WALKING과는 별개).


| #   | 시나리오          | 검증 항목                                                                                                 |
| --- | ------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 경로 탭 진입       | 바 상세에서 "Directions" → DirectionsSheet → `/directions` 이동, 또는 sessionStorage에 `directions-bar` 저장 후 이동 |
| 2   | 단일 바 표시       | sessionStorage에서 `directions-bar` 1개를 읽어 목적지로 설정                                                      |
| 3   | 유저 위치 → 바 길안내 | 유저 현재 위치(origin) → 바 좌표(destination) TRANSIT(UI 기본)으로 길안내 표시                                          |
| 4   | 기본 이동 수단      | TRANSIT 모드가 UI 기본 선택 (API 기본값 WALKING과 별개)                                                            |
| 5   | 이동 수단 변경      | Transit ↔ Walking/Driving 전환 시 경로 갱신                                                                  |
| 6   | 거리/시간 표시      | `directions-distance`, `directions-duration` 노출                                                       |
| 7   | 폴리라인          | 경로 폴리라인 지도에 표시                                                                                        |
| 8   | 빈 상태          | 캐시된 바가 없을 때 빈 상태 안내 + 검색 탭 유도                                                                         |
| 9   | 직접 진입/새로고침    | 캐시 소멸 → 빈 상태 안내                                                                                       |


### 경로 탭 진입 흐름


| #   | 시나리오                                           | 검증 항목                                                                                                |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | 바 상세 → Directions                              | 바 상세 사이드바 "Directions" 버튼 → DirectionsSheet → `/directions` 이동 + sessionStorage에 `directions-bar` 저장 |
| 2   | 직접 진입 (sessionStorage에 directions-bar 있음)      | 해당 바를 목적지로 길안내 표시                                                                                    |
| 3   | 직접 진입/새로고침 (sessionStorage에 directions-bar 없음) | 빈 상태 안내 ("No directions available") + 검색 페이지 유도 링크 표시                                                |
| 4   | 위치 권한 거부                                       | 길안내 불가 안내 메시지 표시                                                                                     |


### 경로 탭 데스크탑 레이아웃


| #   | 시나리오         | 검증 항목                                       |
| --- | ------------ | ------------------------------------------- |
| 1   | 2열 레이아웃      | 좌측 지도 + 우측 경로 패널 표시 (`lg:` 이상)              |
| 2   | Header 경로 링크 | 데스크탑 Header에서 "경로" 링크 클릭 → `/directions` 이동 |


### 대중교통 모드

> 경로 탭 내에서 대중교통 모드 선택 시.


| #   | 시나리오  | 검증 항목                                                      |
| --- | ----- | ---------------------------------------------------------- |
| 1   | 대안 경로 | `route-selector` 노출 + `route-option-0`, `route-option-1` 등 |
| 2   | 경로 선택 | 대안 카드 클릭 → 지도 폴리라인 변경                                      |
| 3   | 타임라인  | 출발 마커 → 도보 구간 → 대중교통 구간 (노선명, 정류장 수) → 도착 마커               |


### 근처 바 (홈 페이지)

> 홈 페이지(`/`)에 `NearbyBarsList` 컴포넌트로 표시. 위치 권한 + 인증 상태에 따라 분기.


| #   | 시나리오       | 검증 항목                                                                                                   |
| --- | ---------- | ------------------------------------------------------------------------------------------------------- |
| 1   | 인증 + 위치 허용 | 유저 위치 기반 근처 바를 벤토 그리드 레이아웃으로 표시                                                                         |
| 2   | 인증 + 위치 거부 | "Allow location access to find bars near you" 안내 + "Allow Location" 버튼 + 최신 바 목록(FallbackLatestBars) 표시 |
| 3   | 미인증        | "Log in to discover bars near you" 안내 + 로그인 CTA 버튼                                                      |
| 4   | 근처 바 없음    | EmptyState ("No bars found nearby") + 검색 페이지 유도                                                         |
| 5   | 바 카드 클릭    | `/bars/[id]`로 이동                                                                                        |


### 주소 검색 (바 등록)


| #   | 시나리오    | 검증 항목                                           |
| --- | ------- | ----------------------------------------------- |
| 1   | 자동완성    | 주소 입력 → 자동완성 드롭다운 표시                            |
| 2   | 선택      | 자동완성 결과 선택 → lat/lng/address/city/country 자동 채움 |
| 3   | 지도 업데이트 | 선택 후 지도 마커 이동                                   |


### 에러 처리

> 경로 탭 및 DirectionsSheet에서 길안내 API 에러 발생 시. 실제 코드는 404와 기타 에러 2가지만 구분한다.


| #   | 시나리오                          | 검증 항목                                                |
| --- | ----------------------------- | ---------------------------------------------------- |
| 1   | 경로 없음 (404)                   | "No route found for this travel mode" 메시지             |
| 2   | 기타 에러 (502, 429/503 등)       | "An error occurred while fetching directions" 메시지     |


