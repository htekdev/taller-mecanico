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

    // Ensure we're starting in light mode (remove dark class if present from prior test)
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('taller-theme');
    });

    // Light mode: button shows moon emoji
    await expect(toggleBtn).toContainText('🌙');

    // Click → should switch to dark
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // html element should have .dark class
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDark).toBe(true);

    // Button should now show sun emoji
    await expect(toggleBtn).toContainText('☀️');
  });

  test('clicking toggle again switches back to light mode', async ({ page, loginPage }) => {
    await loginPage.loginAsTestUser();

    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    const toggleBtn = page.locator('[data-testid="theme-toggle"]');
    await toggleBtn.waitFor({ state: 'visible', timeout: 10_000 });

    // Start fresh in dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('taller-theme', 'dark');
    });
    // Force React to re-read state by reloading
    await page.reload();
    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    const toggleBtnReloaded = page.locator('[data-testid="theme-toggle"]');
    await toggleBtnReloaded.waitFor({ state: 'visible', timeout: 10_000 });

    // Should be dark — button shows sun
    await expect(toggleBtnReloaded).toContainText('☀️');

    // Click → back to light
    await toggleBtnReloaded.click();
    await page.waitForTimeout(500);

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDark).toBe(false);

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

    // Toggle to dark
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Verify localStorage was updated
    const storedTheme = await page.evaluate(() => localStorage.getItem('taller-theme'));
    expect(storedTheme).toBe('dark');

    // Reload — theme should persist
    await page.reload();
    await page.locator('[data-testid="app-content-loaded"]')
      .waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});

    const hasDarkAfterReload = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(hasDarkAfterReload).toBe(true);

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

    // Verify light background is NOT dark slate
    const lightBg = await page.evaluate(() => {
      const el = document.querySelector('.min-h-screen');
      return window.getComputedStyle(el!).backgroundColor;
    });
    // Light mode: bg-slate-50 ≈ rgb(248, 250, 252)
    expect(lightBg).toMatch(/248|249|250/);

    // Switch to dark
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Dark mode: bg-slate-900 ≈ rgb(15, 23, 42)
    const darkBg = await page.evaluate(() => {
      const el = document.querySelector('.min-h-screen');
      return window.getComputedStyle(el!).backgroundColor;
    });
    expect(darkBg).toMatch(/15|23|42/);

    // Clean up
    await page.evaluate(() => localStorage.removeItem('taller-theme'));
  });
});
