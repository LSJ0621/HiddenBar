const IS_BROWSER = typeof window !== 'undefined';

/** 로그인 상태 확인 (비-httpOnly 플래그 쿠키) */
export const isLoggedIn = (): boolean => {
  if (!IS_BROWSER) return false;
  return document.cookie.includes('isLoggedIn=true');
};

/** 클라이언트 사이드 플래그 정리 (엣지 케이스용) */
export const clearIsLoggedIn = (): void => {
  if (!IS_BROWSER) return;
  document.cookie = 'isLoggedIn=; path=/; max-age=0';
};
