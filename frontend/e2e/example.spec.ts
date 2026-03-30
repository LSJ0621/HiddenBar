import { test, expect } from '@playwright/test';

test('홈페이지에 접근할 수 있다', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/');
});
