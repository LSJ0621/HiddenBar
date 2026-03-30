/**
 * 사진 배열에서 order가 가장 낮은 사진의 URL을 썸네일로 추출한다.
 */
export function extractThumbnail(
  photos: { url: string; order: number }[],
): string | null {
  if (!photos || photos.length === 0) {
    return null;
  }
  const sorted = [...photos].sort((a, b) => a.order - b.order);
  return sorted[0].url;
}
