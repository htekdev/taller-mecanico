import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * reportes-module -- Resumen Financiero E2E coverage
 *
 * 6 tests: load, P&L headings, cash cards, month-nav prev, month-nav next, no errors
 */

test.describe('Reportes -- Resumen Financiero Module', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('reportes module loads without crash', async ({ page, dashboardPage }) => {
    test.slow();
    await showPhaseLabel(page, 'Navigate to Resumen');
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();
    await expectVisible(dashboardPage.nav, 'Nav still present');
    const crashed = await page.getByText(/error al cargar|algo salio mal/i).isVisible().catch(() => false);
    expect(crashed, 'No fatal error after loading Resumen').toBe(false);
  });

  test('reportes shows P&L headings in Spanish', async ({ page, dashboardPage }) => {
    test.slow();
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);
    const headings = ['Estado de Resultados', 'Utilidad Bruta', 'Utilidad Neta', 'Ingresos'];
    let found = false;
    for (const h of headings) {
      if (await page.getByText(h).first().isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found, 'At least one P&L heading visible').toBe(true);
  });

  test('reportes renders cash flow cards', async ({ page, dashboardPage }) => {
    test.slow();
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);
    const cashLabels = ['COBRADO', 'POR COBRAR', 'PAGADO A PROVEEDORES', 'FLUJO NETO'];
    let found = false;
    for (const label of cashLabels) {
      if (await page.getByText(label).first().isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found, 'At least one cash flow card visible').toBe(true);
  });

  test('month nav prev changes the month label', async ({ page, dashboardPage }) => {
    test.slow();
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);
    const prevBtn = page.locator('button').filter({ hasText: /\u25C0/ }).first();
    if (await prevBtn.isVisible().catch(() => false)) {
      const monthEl = page.locator('h2,h3,p').filter({ hasText: /20\d\d/ }).first();
      const before = await monthEl.textContent().catch(() => '');
      await prevBtn.click();
      await page.waitForTimeout(800);
      const after = await monthEl.textContent().catch(() => '');
      expect(after, 'Month label changes after prev click').not.toBe(before);
    } else {
      const err = await page.getByText(/error al cargar|algo salió mal|algo salio mal/i).first().isVisible().catch(() => false);
      expect(err, 'No error visible if no prev button').toBe(false);
    }
  });

  test('month nav next accessible after going back', async ({ page, dashboardPage }) => {
    test.slow();
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);
    const prevBtn = page.locator('button').filter({ hasText: /\u25C0/ }).first();
    if (await prevBtn.isVisible().catch(() => false)) {
      await prevBtn.click();
      await page.waitForTimeout(600);
      const nextBtn = page.locator('button').filter({ hasText: /\u25B6/ }).first();
      const nextVisible = await nextBtn.isVisible().catch(() => false);
      expect(nextVisible, 'Next button visible after going back').toBe(true);
      if (nextVisible) { await nextBtn.click(); await page.waitForTimeout(500); }
    }
  });

  test('reportes shows no error messages in UI', async ({ page, dashboardPage }) => {
    test.slow();
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(2000);
    for (const txt of ['Error al cargar', 'Failed to fetch', 'Algo salio mal']) {
      const vis = await page.getByText(txt, { exact: false }).first().isVisible().catch(() => false);
      expect(vis, 'Must not show: ' + txt).toBe(false);
    }
    await expectVisible(dashboardPage.nav, 'Nav present -- not crashed');
  });
});
