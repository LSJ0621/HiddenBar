import {
  BarStatus,
  DayOfWeek,
  TravelMode,
  AdminActionType,
  AdminBarsSortBy,
  Role,
  ReviewStatus,
  ReportReason,
  ReportStatus,
  ReportResolution,
} from '@my-project/shared';


export const SEARCH_DEBOUNCE_MS = 300;

/** 검색 결과 페이지당 항목 수 */
export const SEARCH_PAGE_SIZE = 5;

/** 검색 쿼리 stale time (5분) */
export const SEARCH_STALE_TIME = 5 * 60 * 1000;

/** 검색 쿼리 garbage collection time (30분) */
export const SEARCH_GC_TIME = 30 * 60 * 1000;

export const NEARBY_RADIUS_KM = 5;

export const NEARBY_LIMIT = 6;

export const NEARBY_SIDEBAR_FETCH = 20;

export const NEARBY_SIDEBAR_STEP = 5;

export const SKELETON_COUNT = 6;

/** Korean labels for bar status */
export const BAR_STATUS_LABELS: Record<BarStatus, string> = {
  [BarStatus.PENDING]: 'Pending',
  [BarStatus.APPROVED]: 'Approved',
  [BarStatus.REJECTED]: 'Rejected',
};

/** Badge variant mapping for bar status */
export const BAR_STATUS_VARIANTS: Record<BarStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [BarStatus.PENDING]: 'secondary',
  [BarStatus.APPROVED]: 'default',
  [BarStatus.REJECTED]: 'destructive',
};

/** Korean labels for days of week */
export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.MON]: 'Mon',
  [DayOfWeek.TUE]: 'Tue',
  [DayOfWeek.WED]: 'Wed',
  [DayOfWeek.THU]: 'Thu',
  [DayOfWeek.FRI]: 'Fri',
  [DayOfWeek.SAT]: 'Sat',
  [DayOfWeek.SUN]: 'Sun',
};

/** Korean labels for travel modes */
export const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  [TravelMode.WALKING]: 'Walking',
  [TravelMode.TRANSIT]: 'Transit',
  [TravelMode.DRIVING]: 'Driving',
};

/** Default map center (Seoul) */
export const DEFAULT_MAP_CENTER = { lat: 37.5665, lng: 126.978 };

/** Default map zoom level */
export const DEFAULT_MAP_ZOOM = 15;

/** Maximum number of photos per bar */
export const MAX_PHOTOS = 5;

/** Maximum photo file size in MB */
export const MAX_PHOTO_SIZE_MB = 5;

/** Accepted image MIME types */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Default limit for my bars list */
export const MY_BARS_DEFAULT_LIMIT = 12;

/** Default limit for bookmarks list */
export const BOOKMARKS_DEFAULT_LIMIT = 12;

/** Default limit for admin tables */
export const ADMIN_DEFAULT_LIMIT = 20;

/** Korean labels for admin action types */
export const ADMIN_ACTION_TYPE_LABELS: Record<AdminActionType, string> = {
  [AdminActionType.BAR_APPROVED]: 'Bar Approved',
  [AdminActionType.BAR_REJECTED]: 'Bar Rejected',
  [AdminActionType.BAR_DELETED]: 'Bar Deleted',
  [AdminActionType.USER_SUSPENDED]: 'User Suspended',
  [AdminActionType.USER_ACTIVATED]: 'User Activated',
  [AdminActionType.USER_ROLE_CHANGED]: 'Role Changed',
  [AdminActionType.REVIEW_HIDDEN]: 'Review Hidden',
  [AdminActionType.REVIEW_RESTORED]: 'Review Restored',
  [AdminActionType.REVIEW_DELETED]: 'Review Deleted',
};

/** Korean labels for user roles */
export const ROLE_LABELS: Record<Role, string> = {
  [Role.USER]: 'User',
  [Role.ADMIN]: 'Admin',
};

/** Default limit for reviews list */
export const REVIEWS_DEFAULT_LIMIT = 10;


/** Review status labels */
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  [ReviewStatus.PUBLISHED]: 'Published',
  [ReviewStatus.HIDDEN]: 'Hidden',
  [ReviewStatus.REPORTED]: 'Reported',
};

/** Review status badge variants */
export const REVIEW_STATUS_VARIANTS: Record<ReviewStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [ReviewStatus.PUBLISHED]: 'default',
  [ReviewStatus.HIDDEN]: 'secondary',
  [ReviewStatus.REPORTED]: 'destructive',
};

/** Maximum review content length */
export const MAX_REVIEW_CONTENT_LENGTH = 2000;

/** Report reason labels */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  [ReportReason.SPAM]: 'Spam',
  [ReportReason.ABUSIVE_OR_HATEFUL]: 'Abusive or Hateful',
  [ReportReason.SEXUAL_OR_OBSCENE]: 'Sexual or Obscene',
  [ReportReason.MISINFORMATION]: 'Misinformation',
  [ReportReason.OTHER]: 'Other',
};

/** Report status labels */
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.PENDING]: 'Pending',
  [ReportStatus.RESOLVED]: 'Resolved',
};

/** Report resolution labels */
export const REPORT_RESOLUTION_LABELS: Record<ReportResolution, string> = {
  [ReportResolution.RESTORED]: 'Restored',
  [ReportResolution.HIDDEN]: 'Hidden',
  [ReportResolution.DELETED]: 'Deleted',
};

/** Korean labels for admin bars sort options */
export const ADMIN_BARS_SORT_LABELS: Record<AdminBarsSortBy, string> = {
  [AdminBarsSortBy.NEWEST]: 'Newest',
  [AdminBarsSortBy.OLDEST]: 'Oldest',
  [AdminBarsSortBy.NAME]: 'Name',
};
