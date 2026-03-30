/** 리다이렉트 경로가 안전한 내부 경로인지 검증하고, 안전하지 않으면 '/'를 반환 */
export function getSafeRedirect(redirect: string | null): string {
  if (!redirect) return '/';
  if (!redirect.startsWith('/') || redirect.startsWith('//') || redirect.includes(':')) {
    return '/';
  }
  return redirect;
}
