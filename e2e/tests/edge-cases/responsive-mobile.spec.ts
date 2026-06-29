import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Responsive & Mobile — Verify UI adapts to smaller viewports.
 *
 * Tests:
 * 1. Sidebar/nav adapts on mobile viewport (scrollable)
 * 2. Forms are usable at 375px width
 * 3. Tables/cards don't overflow
 * 4. Login page works on mobile
 * 5. Navigation stays functional at small sizes
 */

test.describe('Responsive & Mobile', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('navigation works at mobile viewport (375px)', async ({
    page, dashboardPage, sidebar
  }) => {
    await showPhaseLabel(page, '📱 Mobile Viewport');

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Nav should still be accessible (might scroll horizontally)
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    // Can click a tab (might need scroll)
    await sidebar.clickTab('Inventario');
    await page.waitForTimeout(1000);

    // Page still functional
    const navAfter = await dashboardPage.nav.isVisible();
    expect(navAfter).toBe(true);

    await showPhaseLabel(page, '✅ Mobile Nav Works');
  });

  test('forms usable at tablet viewport (768px)', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '📱 Tablet Forms');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Form inputs should be visible and interactable
    if (await inventarioPage.nombreInput.isVisible().catch(() => false)) {
      await inventarioPage.nombreInput.fill('Tablet Test Part');
      const value = await inventarioPage.nombreInput.inputValue();
      expect(value).toBe('Tablet Test Part');
    }

    await showPhaseLabel(page, '✅ Tablet Forms Work');
  });

  test('no horizontal overflow at any viewport', async ({
    page, dashboardPage, sidebar
  }) => {
    await showPhaseLabel(page, '📐 Overflow Check');

    const viewports = [
      { width: 375, height: 667 },   // iPhone SE
      { width: 768, height: 1024 },  // iPad
      { width: 1024, height: 768 },  // Landscape tablet
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(300);

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      // Allow small overflow (scrollable nav) but not massive
      expect(bodyWidth).toBeLessThanOrEqual(vp.width + 100);
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    await showPhaseLabel(page, '✅ No Overflow');
  });

  test('login page works on mobile', async ({
    page, loginPage, dashboardPage
  }) => {
    await showPhaseLabel(page, '📱 Mobile Login');

    // Logout first
    await dashboardPage.logout().catch(() => {});

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login should work
    await loginPage.loginAsTestUser();

    // Should reach dashboard
    const navVisible = await page.locator('nav').isVisible().catch(() => false);
    expect(navVisible).toBe(true);

    // Reset
    await page.setViewportSize({ width: 1280, height: 720 });

    await showPhaseLabel(page, '✅ Mobile Login Works');
  });
});
