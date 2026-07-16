import { test, expect } from '../../fixtures';

/**
 * Dark Mode Toggle — Validates theme switching infrastructure.
 *
 * Tests:
 *  1. ThemeToggle button is visible in the app header after login
 *  2. Clicking toggle adds 'dark' class to <html> (moon→sun)
 *  3. Clicking toggle again removes 'dark' class from <html> (sun→moon)
 *  4. Theme persists across page reload (localStorage)
 *  5. Dark mode applies correct background on main wrapper
 */

test.describe('dark-mode-toggle', () => {
  test.describe.configure({ retries: 1 });

  test('ThemeToggle is visible in header after login', async ({ page, loginPage }) => {
    await loginPage.loginAsTestUser();

    // Wait for app content
    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    const toggleBtn = page.locator('[data-testid="theme-toggle"]');
    await expect(toggleBtn).toBeVisible({ timeout: 10_000 });
  });

  test('clicking toggle switches to dark mode (adds .dark to <html>)', async ({ page, loginPage }) => {
    await loginPage.loginAsTestUser();

    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    const toggleBtn = page.locator('[data-testid="theme-toggle"]');
    await toggleBtn.waitFor({ state: 'visible', timeout: 10_000 });

    // Ensure we're starting in light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('taller-theme');
    });

    // Light mode: button shows moon emoji
    await expect(toggleBtn).toContainText('🌙');

    // Click → should switch to dark
    await toggleBtn.click();

    // Wait for .dark class to appear on <html> (not a fixed sleep)
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 3_000 });

    // Button should now show sun emoji
    await expect(toggleBtn).toContainText('☀️');
  });

  test('clicking toggle again switches back to light mode', async ({ page, loginPage }) => {
    await loginPage.loginAsTestUser();

    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    const toggleBtn = page.locator('[data-testid="theme-toggle"]');
    await toggleBtn.waitFor({ state: 'visible', timeout: 10_000 });

    // Start fresh in dark mode — set localStorage and reload so blocking script picks it up
    await page.evaluate(() => {
      localStorage.setItem('taller-theme', 'dark');
    });
    await page.reload();
    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    const toggleBtnReloaded = page.locator('[data-testid="theme-toggle"]');
    await toggleBtnReloaded.waitFor({ state: 'visible', timeout: 10_000 });

    // Should be dark — button shows sun
    await expect(toggleBtnReloaded).toContainText('☀️');

    // Click → back to light
    await toggleBtnReloaded.click();

    // Wait for .dark class to be removed from <html>
    await expect(page.locator('html')).not.toHaveClass(/dark/, { timeout: 3_000 });

    await expect(toggleBtnReloaded).toContainText('🌙');
  });

  test('dark mode preference persists across page reload (localStorage)', async ({ page, loginPage }) => {
    await loginPage.loginAsTestUser();

    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    const toggleBtn = page.locator('[data-testid="theme-toggle"]');
    await toggleBtn.waitFor({ state: 'visible', timeout: 10_000 });

    // Ensure starting in light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('taller-theme', 'light');
    });

    // Toggle to dark — wait for class to confirm the toggle completed
    await toggleBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 3_000 });

    // Verify localStorage was updated
    const storedTheme = await page.evaluate(() => localStorage.getItem('taller-theme'));
    expect(storedTheme).toBe('dark');

    // Reload — theme should persist (blocking script in layout.tsx applies .dark before paint)
    await page.reload();
    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 5_000 });

    // Clean up
    await page.evaluate(() => localStorage.removeItem('taller-theme'));
  });

  test('dark mode applies dark background to main wrapper', async ({ page, loginPage }) => {
    await loginPage.loginAsTestUser();

    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    const toggleBtn = page.locator('[data-testid="theme-toggle"]');
    await toggleBtn.waitFor({ state: 'visible', timeout: 10_000 });

    // Ensure starting in light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('taller-theme');
    });

    const appWrapper = page.locator('[data-testid="app-wrapper"]');
    await expect(appWrapper).toBeVisible({ timeout: 5_000 });

    // Light mode: bg-slate-50 = rgb(248, 250, 252)
    const lightBg = await appWrapper.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(lightBg).toBe('rgb(248, 250, 252)');

    // Switch to dark and wait for class to apply
    await toggleBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 3_000 });

    // Dark mode: bg-slate-900 = rgb(15, 23, 42)
    const darkBg = await appWrapper.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(darkBg).toBe('rgb(15, 23, 42)');

    // Clean up
    await page.evaluate(() => localStorage.removeItem('taller-theme'));
  });
});

