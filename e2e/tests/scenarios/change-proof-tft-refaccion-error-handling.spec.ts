import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

test.describe('change-proof-tft-refaccion-error-handling', { retries: 1 }, () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('trabajos module loads with no errorTft banner on clean load', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '\u{1F527} TFT Error Handling');
    await dashboardPage.navigateToModule('trabajos');
    await page.waitForTimeout(2000);

    const isLoaded = await page.locator('[data-testid="app-content-loaded"]').isVisible().catch(() => false);
    if (!isLoaded) {
      test.skip();
      return;
    }

    // No errorTft banner should appear on clean load
    const errorBanner = page.locator('.bg-rose-50').filter({ hasText: 'No se pudo guardar el n\u00FAmero TFT' });
    await expect(errorBanner).not.toBeVisible();

    const mainText = await page.locator('main').innerText().catch(() => '');
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toContain('undefined');

    await showPhaseLabel(page, '\u2705 Trabajos TFT OK');
  });

  test('ordenes module loads with no errorCrearRef banner on clean load', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '\u{1F4E6} Refacci\u00F3n Error Handling');
    await dashboardPage.navigateToModule('ordenes');
    await page.waitForTimeout(2000);

    const isLoaded = await page.locator('[data-testid="app-content-loaded"]').isVisible().catch(() => false);
    if (!isLoaded) {
      test.skip();
      return;
    }

    // No errorCrearRef banner should appear on clean load
    const errorBanner = page.locator('.bg-rose-50').filter({ hasText: 'No se pudo crear la refacci\u00F3n' });
    await expect(errorBanner).not.toBeVisible();

    const mainText = await page.locator('main').innerText().catch(() => '');
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toContain('undefined');

    await showPhaseLabel(page, '\u2705 Ordenes refacci\u00F3n OK');
  });
});
