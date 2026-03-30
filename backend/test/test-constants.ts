/**
 * E2E 테스트에서 사용하는 표준 테스트 데이터 상수.
 */

/** 표준 테스트 유저 */
export const TEST_USER_1 = {
  email: 'user1@test.com',
  password: 'Test1234!',
  name: '테스트유저1',
} as const;

export const TEST_USER_2 = {
  email: 'user2@test.com',
  password: 'Test1234!',
  name: '테스트유저2',
} as const;

export const TEST_ADMIN = {
  email: 'admin@test.com',
  password: 'Test1234!',
  name: '관리자',
} as const;

/** 표준 바 DTO 템플릿 */
export const TEST_BAR_DTO = {
  name: '테스트 바',
  description: '테스트용 바입니다',
  address: '서울시 강남구 테헤란로 123',
  city: 'Seoul',
  country: 'South Korea',
  latitude: 37.5065,
  longitude: 127.0536,
} as const;
