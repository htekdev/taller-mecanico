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
 * Degrades gracefully when SUPABASE_SERVICE_ROLE_KEY is not configured in the Vercel
 * preview environment (API returns 5xx). In that case a warning is logged and the
 * function returns without throwing, letting the caller's UI assertion handle the check.
 *
 * @param page           - Playwright page (used for same-origin request context)
 * @param tableName      - Supabase table name (must be in the endpoint's allowlist)
 * @param recordName     - Value of the `nombre` column to look for (case-insensitive)
 * @param timeoutMs      - Maximum wait time in ms (default: 60 000)
 * @param pollIntervalMs - How often to poll in ms (default: 3 000)
 * @throws               - If the API is available but the record is not found within timeoutMs
 */
export async function waitForDbRecord(
  page: Page,
  tableName: string,
  recordName: string,
  timeoutMs = 60_000,
  pollIntervalMs = 3_000
): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
  const params = new URLSearchParams({ table: tableName, name: recordName, email });
  const url = `/api/e2e-record-exists?${params.toString()}`;

  // --- Availability probe (1 request, no retry) ---
  // If the endpoint returns 5xx, SUPABASE_SERVICE_ROLE_KEY is not configured.
  // Degrade gracefully: log a warning and return so the caller's UI assertion runs.
  let apiAvailable = false;
  try {
    const probe = await page.request.get(url);
    if (probe.status() >= 500) {
      console.warn(
        `[waitForDbRecord] /api/e2e-record-exists returned HTTP ${probe.status()} — ` +
        `SUPABASE_SERVICE_ROLE_KEY is likely not set in this Vercel preview environment. ` +
        `Skipping DB-level wait for "${recordName}". ` +
        `Add the secret to Vercel project env vars to enable precise DB-commit detection.`
      );
      return; // non-fatal — let caller's expect().toBeVisible() handle it
    }
    if (probe.ok()) {
      apiAvailable = true;
      const body = await probe.json() as { exists?: boolean };
      if (body.exists === true) return;
    }
  } catch {
    // Network/serialization error on the probe itself — skip DB check
    console.warn(`[waitForDbRecord] probe request failed for "${recordName}" — skipping DB check`);
    return;
  }

  if (!apiAvailable) {
    // Non-5xx but also not ok (e.g. 4xx config error) — degrade same way
    console.warn(`[waitForDbRecord] API returned a non-success status — skipping DB check for "${recordName}"`);
    return;
  }

  // --- Normal polling loop (API is available and confirmed reachable) ---
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await page.request.get(url);
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
