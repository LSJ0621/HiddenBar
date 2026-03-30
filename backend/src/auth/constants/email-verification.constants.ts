export enum EmailVerificationPurpose {
  SIGNUP = 'SIGNUP',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

/** 인증 코드 자릿수 */
export const CODE_LENGTH = 6;

/** 인증 코드 만료 시간 (분) */
export const CODE_EXPIRATION_MINUTES = 3;

/** 일일 최대 발송 횟수 */
export const DAILY_SEND_LIMIT = 5;

/** 최대 인증 실패 횟수 */
export const MAX_FAIL_COUNT = 5;

/** 인증 토큰 유효 시간 (분) */
export const VERIFICATION_TOKEN_EXPIRATION_MINUTES = 10;
