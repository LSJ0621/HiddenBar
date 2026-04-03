/**
 * 거리(km)를 사람이 읽기 좋은 문자열로 변환한다.
 * 1km 미만이면 미터(m) 단위로, 1km 이상이면 소수점 한 자리 km 단위로 반환한다.
 *
 * @param km - 킬로미터 단위 거리
 * @returns 포맷된 거리 문자열 (예: "350m", "1.2km")
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}
