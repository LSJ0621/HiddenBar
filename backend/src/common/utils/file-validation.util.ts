/**
 * Magic bytes 기반 이미지 파일 검증 유틸리티.
 * 파일 확장자 위조를 방지하기 위해 파일 시그니처를 검사한다.
 */

interface MagicBytesPattern {
  signature: number[];
  offset?: number;
}

const IMAGE_MAGIC_BYTES: Record<string, MagicBytesPattern[]> = {
  jpeg: [{ signature: [0xff, 0xd8, 0xff] }],
  png: [{ signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  webp: [
    { signature: [0x52, 0x49, 0x46, 0x46] },
    { signature: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  ],
};

function matchesPattern(buffer: Buffer, pattern: MagicBytesPattern): boolean {
  const offset = pattern.offset ?? 0;
  if (buffer.length < offset + pattern.signature.length) {
    return false;
  }
  return pattern.signature.every(
    (byte, index) => buffer[offset + index] === byte,
  );
}

/**
 * 이미지 파일의 magic bytes를 검증한다.
 * @param buffer 파일 버퍼
 * @returns 유효한 이미지 파일이면 true
 */
export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  for (const [format, patterns] of Object.entries(IMAGE_MAGIC_BYTES)) {
    if (format === 'webp') {
      const allMatch = patterns.every((p) => matchesPattern(buffer, p));
      if (allMatch) return true;
    } else {
      const anyMatch = patterns.some((p) => matchesPattern(buffer, p));
      if (anyMatch) return true;
    }
  }

  return false;
}
