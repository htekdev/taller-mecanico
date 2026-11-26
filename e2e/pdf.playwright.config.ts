import { defineConfig } from '@playwright/test';
import config from './playwright.config';

/**
 * Isolated PDF regression: synthetic intercepted API only. No account
 * provisioning, database cleanup or private shop records are needed.
 */
export default defineConfig(config, {
  globalSetup: undefined,
  testMatch: '**/change-proof-quotation-pdf-pagination.spec.ts',
  workers: 1,
});
