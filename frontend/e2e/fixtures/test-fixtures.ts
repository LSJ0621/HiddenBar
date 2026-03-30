import { test as base } from '@playwright/test';
import path from 'path';

/**
 * 인증된 일반 유저 픽스처.
 */
export const authenticatedUser = base.extend({
  storageState: path.resolve(__dirname, '../.auth/user.json'),
});

/**
 * 인증된 관리자 픽스처.
 */
export const authenticatedAdmin = base.extend({
  storageState: path.resolve(__dirname, '../.auth/admin.json'),
});

/**
 * 미인증 유저 픽스처 (storageState 없음).
 */
export const unauthenticated = base.extend({
  storageState: { cookies: [], origins: [] },
});

export { expect } from '@playwright/test';
