import type { Page } from '@playwright/test';

/**
 * Helper utilities for E2E tests.
 */

/** Login with test credentials — convenience for tests that don't use the LoginPage POM directly. */
export async function quickLogin(page: Page) {
  const email = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
  const password = process.env.E2E_TEST_PASSWORD || 'Test1234!';

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Check if already logged in
  const navButton = page.locator('nav button').first();
  const emailField = page.locator('input[type="email"]');

  const firstVisible = await Promise.race([
    emailField.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'login' as const),
    navButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'dashboard' as const),
  ]).catch(() => 'timeout' as const);

  if (firstVisible === 'dashboard') return;
  if (firstVisible === 'timeout') {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await navButton.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    return;
  }

  await emailField.fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await navButton.waitFor({ state: 'visible', timeout: 20_000 });
}

/** Navigate to a module via the sidebar nav. */
export async function navigateToModule(page: Page, label: string) {
  await page.locator(`nav button:has-text("${label}")`).click();
  await page.waitForTimeout(500);
}

/** Wait for page to finish loading (loading indicator gone). */
export async function waitForDataLoaded(page: Page) {
  await page.locator('text=Cargando datos...').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
}

/** Take a named screenshot for debugging. */
export async function debugScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/results/debug-${name}.png`, fullPage: true });
}
