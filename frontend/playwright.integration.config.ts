import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './integration',
  workers: 1,
  timeout: 60000,
  use: { baseURL: process.env.OVERLOG_BASE_URL || 'http://127.0.0.1:5180', headless: true },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
