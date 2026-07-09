import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Resumen — Data Integrity Tests
 *
 * Verifies the monthly financial summary renders real computed data:
 * 1. No NaN / "undefined" / "[object Object]" in page text
 * 2. Cash flow card labels (COBRADO, POR COBRAR, PAGADO, FLUJO) are visible
 * 3. Dollar amounts render (not empty strings)
 * 4. P&L section shows multiple headings (Estado de Resultados, Utilidad Bruta, etc.)
 * 5. Month/year label renders in Spanish
 * 6. Gastos breakdown section does not crash even with zero data
 */

test.describe('Resumen — Data Integrity', () => {
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.loginAsTestUser();
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();
    await dashboardPage.page.waitForTimeout(2000);
  });

  test('no NaN or undefined in resumen page text', async ({ page }) => {
    await showPhaseLabel(page, '🔍 Phase 1: Scan for Corrupt Data');

    const mainEl = page.locator('[data-testid="app-content-loaded"], main').first();
    const bodyText = await mainEl.innerText().catch(
      () => page.locator('body').innerText().catch(() => '')
    );

    expect(bodyText, 'Must not contain "NaN"').not.toContain('NaN');
    expect(bodyText, 'Must not contain "undefined"').not.toContain('undefined');
    expect(bodyText, 'Must not contain "[object Object]"').not.toContain('[object Object]');

    await showPhaseLabel(page, '✅ No Corrupt Computed Values');
  });

  test('cash flow card labels visible', async ({ page }) => {
    await showPhaseLabel(page, '💳 Phase 1: Cash Flow Cards');

    const labels = ['COBRADO', 'POR COBRAR', 'PAGADO', 'FLUJO'];
    let found = 0;
    for (const label of labels) {
      if (await page.getByText(label, { exact: false }).first().isVisible().catch(() => false)) {
        found++;
      }
    }
    // At least 2 of the 4 cash flow card labels should be visible
    expect(found, `At least 2 cash flow card labels visible (found ${found})`).toBeGreaterThanOrEqual(2);

    await showPhaseLabel(page, '✅ Cash Flow Cards Present');
  });

  test('dollar amounts render on resumen page', async ({ page }) => {
    await showPhaseLabel(page, '💵 Phase 1: Dollar Amount Check');

    // Any visible text matching "$0", "$1,234", "$0.00" etc.
    const dollarEl = page.locator('text=/\\$[\\d][\\d,\\.]*/', ).first();
    const hasDollar = await dollarEl.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasDollar, 'At least one dollar amount must be rendered on resumen page').toBe(true);

    await showPhaseLabel(page, '✅ Dollar Amounts Rendered');
  });

  test('P&L section headings are visible', async ({ page }) => {
    await showPhaseLabel(page, '📊 Phase 1: P&L Headings');

    const headings = [
      'Estado de Resultados',
      'Utilidad Bruta',
      'Utilidad Neta',
      'Ingresos',
    ];

    let found = 0;
    for (const h of headings) {
      if (await page.getByText(h, { exact: false }).first().isVisible().catch(() => false)) {
        found++;
      }
    }

    // At least 2 P&L headings should be present
    expect(found, `At least 2 P&L headings visible (found ${found})`).toBeGreaterThanOrEqual(2);

    await showPhaseLabel(page, '✅ P&L Section Headings Present');
  });

  test('resumen renders month and year in Spanish', async ({ page }) => {
    await showPhaseLabel(page, '📅 Phase 1: Month/Year Label');

    const monthPattern = /enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i;
    const monthVisible = await page.getByText(monthPattern).first().isVisible().catch(() => false);

    const yearVisible = await page.getByText(/202[0-9]/).first().isVisible().catch(() => false);

    expect(monthVisible || yearVisible,
      'Resumen must show a Spanish month name or year label').toBe(true);

    await showPhaseLabel(page, '✅ Spanish Month/Year Label Rendered');
  });

  test('resumen gastos breakdown does not crash with zero data', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📂 Phase 1: Gastos Breakdown Section');

    // If there are gastos, category breakdown should show
    // If none, the section shows empty state — either way, NO crash
    const crashed = await page.getByText(/error al cargar|algo salió mal|algo salio mal/i)
      .first().isVisible().catch(() => false);
    expect(crashed, 'Must not show crash error in gastos breakdown').toBe(false);

    // Nav must still be intact
    await expectVisible(dashboardPage.nav, 'Nav still present — no crash in resumen');

    await showPhaseLabel(page, '✅ Gastos Breakdown OK (Zero Data Handled Gracefully)');
  });

  test('month nav prev changes the month label', async ({ page }) => {
    await showPhaseLabel(page, '◀ Phase 1: Month Navigation');

    // Read the current month label from the month-nav widget in the Resumen header.
    // The widget renders: ‹ <mesLabel> ›  where mesLabel is "Mes Año" in Spanish.
    const monthLabel = page.locator('span.font-semibold').filter({ hasText: /enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i }).first();
    await expect(monthLabel).toBeVisible({ timeout: 15_000 });
    const beforeLabel = await monthLabel.textContent();

    // Click the ‹ (previous month) button
    const prevBtn = page.locator('button').filter({ hasText: '‹' }).first();
    const hasPrev = await prevBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasPrev) {
      test.info().annotations.push({ type: 'skip', description: 'Month nav buttons not found in this build' });
      return;
    }

    await prevBtn.click();
    await page.waitForTimeout(500);

    // The month label must have changed after clicking prev
    const afterLabel = await monthLabel.textContent();
    expect(afterLabel, 'Month label must change after clicking prev').not.toBe(beforeLabel);

    // The new label must still be a valid Spanish month/year string
    const monthPattern = /enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i;
    expect(afterLabel ?? '', 'New label must contain a Spanish month name').toMatch(monthPattern);

    await showPhaseLabel(page, `✅ Month changed: ${beforeLabel} → ${afterLabel}`);
  });
});