import { TravelMode } from '@my-project/shared';

/** Google Routes API v2 엔드포인트 URL */
export const GOOGLE_ROUTES_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

/** Google Routes API 요청 타임아웃 (밀리초) */
export const GOOGLE_ROUTES_TIMEOUT = 10000;

/** 앱 TravelMode → Google Routes API v2 TravelMode 매핑 */
export const TRAVEL_MODE_MAP: Record<TravelMode, string> = {
  [TravelMode.WALKING]: 'WALK',
  [TravelMode.DRIVING]: 'DRIVE',
  [TravelMode.TRANSIT]: 'TRANSIT',
};

/** 기본 필드 마스크 */
export const BASE_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.localizedValues,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.travelMode,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration';

/** 대중교통 모드 추가 필드 마스크 */
export const TRANSIT_EXTRA_FIELDS =
  ',routes.legs.steps.transitDetails,routes.legs.steps.polyline.encodedPolyline';

/** 대중교통 노선 기본 색상 */
export const DEFAULT_LINE_COLOR = '#4285F4';

/** 대중교통 노선 기본 텍스트 색상 */
export const DEFAULT_LINE_TEXT_COLOR = '#FFFFFF';
