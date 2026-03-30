/**
 * Remove null/undefined values from params object.
 */
export function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
