/** Bookmark item from GET /users/me/bookmarks */
export interface BookmarkItem {
  id: number;
  name: string;
  city: string;
  country: string;
  thumbnail: string | null;
  bookmarkCount: number;
  averageRating: number;
  reviewCount: number;
  bookmarkedAt: string;
}

/** PATCH /users/me body */
export interface UpdateProfileDto {
  name?: string;
}

/** PATCH /users/me/password body */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
