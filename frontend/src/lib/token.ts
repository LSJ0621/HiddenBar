const IS_BROWSER = typeof window !== 'undefined';

const USER_CACHE_KEY = 'cached_user';

/** 헤더 즉시 렌더링용 캐시 데이터 */
export interface CachedUser {
  name: string;
  profileImage: string | null;
  role: string;
}

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

/** 유저 기본 정보를 localStorage에 캐싱 */
export const cacheUser = (user: { name: string; profileImage: string | null; role: string }): void => {
  if (!IS_BROWSER) return;
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({
      name: user.name,
      profileImage: user.profileImage,
      role: user.role,
    }));
  } catch { /* localStorage 사용 불가 시 무시 */ }
};

/** 캐싱된 유저 정보 조회 */
export const getCachedUser = (): CachedUser | null => {
  if (!IS_BROWSER) return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** 캐싱된 유저 정보 삭제 */
export const clearCachedUser = (): void => {
  if (!IS_BROWSER) return;
  localStorage.removeItem(USER_CACHE_KEY);
};
