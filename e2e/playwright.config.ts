import { defineConfig, devices } from '@playwright/test';

/**
 * Taller Mecánico E2E Test Configuration
 *
 * Video recording is ON by default for all tests — Hector requires
 * video evidence for every test run.
 *
 * Usage:
 *   BASE_URL=https://preview.vercel.app npx playwright test
 *   npx playwright test                  # uses localhost:3000
 *   npx playwright test --ui             # interactive mode
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './results',

  /* Global setup: provisions test user in target environment before tests run */
  globalSetup: require.resolve('./global-setup'),

  /* Run tests in parallel */
  fullyParallel: true,

  /* Fail CI if test.only is left in source */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests in CI */
  retries: process.env.CI ? 2 : 0,

  /* Single worker in CI to avoid resource contention */
  workers: process.env.CI ? 1 : undefined,

  /* Global test timeout */
  timeout: 60_000,

  /* Reporters: HTML for humans, JSON for S3 upload script */
  reporter: [
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
    ['json', { outputFile: './results/report.json' }],
  ],

  use: {
    /* ALWAYS record video — Hector wants video evidence for every test */
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
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
