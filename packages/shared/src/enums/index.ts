export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
}

export enum BarStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

export enum AdminActionType {
  BAR_APPROVED = 'BAR_APPROVED',
  BAR_REJECTED = 'BAR_REJECTED',
  BAR_DELETED = 'BAR_DELETED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  REVIEW_HIDDEN = 'REVIEW_HIDDEN',
  REVIEW_RESTORED = 'REVIEW_RESTORED',
  REVIEW_DELETED = 'REVIEW_DELETED',
}

export enum ReviewStatus {
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
  REPORTED = 'REPORTED',
}

export enum SearchSortBy {
  RELEVANCE = 'relevance',
  NEWEST = 'newest',
  BOOKMARKS = 'bookmarks',
}

export enum TravelMode {
  DRIVING = 'DRIVING',
  WALKING = 'WALKING',
  TRANSIT = 'TRANSIT',
}

export enum AdminBarsSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  NAME = 'name',
}

export enum ReportReason {
  SPAM = 'SPAM',
  ABUSIVE_OR_HATEFUL = 'ABUSIVE_OR_HATEFUL',
  SEXUAL_OR_OBSCENE = 'SEXUAL_OR_OBSCENE',
  MISINFORMATION = 'MISINFORMATION',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}

export enum ReportResolution {
  RESTORED = 'RESTORED',
  HIDDEN = 'HIDDEN',
  DELETED = 'DELETED',
}
