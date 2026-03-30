/** Google Places API v1 상수 */
export const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';

export const GOOGLE_PLACES_AUTOCOMPLETE_URL = `${GOOGLE_PLACES_BASE_URL}/places:autocomplete`;

/** Place Details URL (placeId를 치환하여 사용) */
export const GOOGLE_PLACES_DETAILS_URL = `${GOOGLE_PLACES_BASE_URL}/places`;

/** getDetails 호출 시 사용하는 필드마스크 */
export const GOOGLE_PLACES_FIELD_MASK =
  'displayName,formattedAddress,addressComponents,location';
