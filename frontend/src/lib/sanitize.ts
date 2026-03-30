import DOMPurify from 'dompurify';

/** DOMPurify를 사용하여 HTML 문자열에서 허용되지 않은 태그/속성을 제거 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}
