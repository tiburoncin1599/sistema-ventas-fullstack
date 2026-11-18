import { defineConfig, devices } from '@playwright/test';
import { BACKEND_URL, FRONTEND_URL } from './e2e/support/env';

/**
 * Sprint 5 — E2E del sistema PROLIMAC SRL.
 *
 * Requisito previo: el stack debe estar levantado en:
 *   - Frontend (Next.js):   http://localhost:3000
 *   - Backend  (NestJS):    http://localhost:3001  (/health)
 *
 *   docker compose up -d --build
 *
 * Se usa un solo worker porque los casos de venta/stock mutan datos reales.
 */

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: FRONTEND_URL,
    acceptDownloads: true,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
