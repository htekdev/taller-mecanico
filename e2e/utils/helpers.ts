import type { Page } from '@playwright/test';

/**
 * Helper utilities for E2E tests.
 */

/**
 * Get visible text from the main content area (excludes script tags, RSC payloads).
 * Use this instead of `page.locator('body').textContent()` which includes Next.js internals.
 */
export async function getVisibleText(page: Page): Promise<string> {
  return page.evaluate(() => {
    // Get only visible text from main content, exclude script/style tags
    const main = document.querySelector('main') || document.body;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'noscript') return NodeFilter.FILTER_REJECT;
        if (parent.closest('[hidden]') || parent.closest('[style*="display: none"]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let text = '';
    while (walker.nextNode()) {
      text += walker.currentNode.textContent;
    }
    return text;
  });
}

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

/**
 * Poll /api/e2e-record-exists until the named record appears in the given Supabase table.
 *
 * Use this after a Supabase INSERT — and especially after logout/re-login — to confirm
 * the record is committed to the DB before asserting its visibility in the UI.
 * This decouples the "DB write committed" check from the app-level Supabase auth client,
 * which can be slow to warm up on Vercel preview cold starts.
 *
 * @param page           - Playwright page (used for same-origin request context)
 * @param tableName      - Supabase table name (must be in the endpoint's allowlist)
 * @param recordName     - Value of the `nombre` column to look for (case-insensitive)
 * @param timeoutMs      - Maximum wait time in ms (default: 60 000)
 * @param pollIntervalMs - How often to poll in ms (default: 3 000)
 * @throws               - If the record is not found within timeoutMs
 */
export async function waitForDbRecord(
  page: Page,
  tableName: string,
  recordName: string,
  timeoutMs = 60_000,
  pollIntervalMs = 3_000
): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const params = new URLSearchParams({ table: tableName, name: recordName, email });
      const response = await page.request.get(`/api/e2e-record-exists?${params.toString()}`);
      if (response.ok()) {
        const body = await response.json() as { exists?: boolean };
        if (body.exists === true) return;
      }
    } catch {
      // Network/parse error — continue polling
    }
    await page.waitForTimeout(pollIntervalMs);
  }

  throw new Error(
    `[waitForDbRecord] "${recordName}" not found in table "${tableName}" after ${timeoutMs}ms`
  );
}
