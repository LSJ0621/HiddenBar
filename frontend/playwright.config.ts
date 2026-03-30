import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'cd ../backend && NODE_ENV=test pnpm start',
      port: 4000,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'rm -rf .next && pnpm dev',
      port: 3000,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
