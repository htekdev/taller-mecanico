import { defineConfig, devices } from '@playwright/test';

/**
 * Taller Mecánico — Comprehensive POM-Based E2E Test Configuration
 *
 * Features:
 * - Page Object Model architecture (e2e/pages/)
 * - Custom fixtures with all POMs pre-instantiated
 * - Visual assertion highlighting in recorded videos
 * - Scenarios, validation, and edge-case test categories
 *
 * Usage:
 *   BASE_URL=https://preview.vercel.app npx playwright test --config=e2e/playwright.config.ts
 *   npx playwright test --config=e2e/playwright.config.ts
 *   npx playwright test --config=e2e/playwright.config.ts --ui
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './results',

  /* Global setup: provisions test user in target environment before tests run */
  globalSetup: require.resolve('./global-setup'),

  /* Run tests in files in parallel, but tests within a file sequentially
     (lifecycle tests have sequential dependencies) */
  fullyParallel: false,

  /* Fail CI if test.only is left in source */
  forbidOnly: !!process.env.CI,

  /* 1 retry in CI to absorb intermittent Supabase/Vercel cold-start flakiness.
     Infrastructure fixes (warm-up, sharding, backoff) handle the root causes;
     this retry is a safety net for residual one-off timeouts. */
  retries: process.env.CI ? 1 : 0,

  /* Single worker in CI to avoid resource contention with shared DB */
  workers: process.env.CI ? 1 : 2,

  /* Global test timeout — 180s for Vercel preview cold-start tolerance.
     Cold-start: navigateToModule sentinel (45s) + loading hide (60s) = 105s worst case.
     Some operations use explicit 60s action timeouts; 180s gives adequate headroom. */
  timeout: 180_000,

  /* Expect timeout */
  expect: { timeout: 10_000 },

  /* Reporters: HTML for humans, JSON for CI/upload */
  reporter: [
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
    ['json', { outputFile: './results/report.json' }],
    ['list'],
  ],

  use: {
    /* ALWAYS record video — visual assertions need video evidence */
    video: 'on',

    /* Screenshot every test (pass or fail) */
    screenshot: 'on',

    /* Trace on first retry — helps debug flaky tests */
    trace: 'on-first-retry',

    /* Standard HD viewport for clean video recordings */
    viewport: { width: 1280, height: 720 },

    /* Base URL — override via BASE_URL env var for preview deployments */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Timeouts */
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
