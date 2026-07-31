import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Resumen Mensual de Facturación — Monthly billing summary.
 *
 * Verifies:
 * 1. Resumen Mensual section renders inside Facturas module
 * 2. Month/year selectors are present and functional
 * 3. "Total Facturado" and "Facturas Emitidas" cards render with valid values
 * 4. Changing the month selector updates the label
 * 5. "Solo facturas con IVA" badge is visible (notas excluded)
 * 6. No NaN or undefined in displayed monetary values
 */

test.describe('Resumen Mensual de Facturación', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('resumen mensual section renders in facturas module', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📊 Phase 1: Navigate to Facturas');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // The Resumen Mensual section must be visible
    const resumenSection = page.locator('[data-testid="resumen-mensual"]');
    await expectVisible(resumenSection, 'Resumen Mensual section visible');

    // Main heading
    const heading = page.getByText(/Resumen Mensual de Facturación/i).first();
    await expectVisible(heading, 'Section heading in Spanish');

    await showPhaseLabel(page, '✅ Resumen Mensual Renders');
  });

  test('month and year selectors are present and functional', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📅 Phase 1: Check Selectors');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Month selector
    const mesSelect = page.getByRole('combobox', { name: /seleccionar mes/i });
    await expectVisible(mesSelect, 'Mes selector visible');

    // Year selector
    const anioSelect = page.getByRole('combobox', { name: /seleccionar año/i });
    await expectVisible(anioSelect, 'Año selector visible');

    // Change month to Enero (value=1)
    await mesSelect.selectOption({ value: '1' });
    await page.waitForTimeout(300);

    // Label "Enero" should appear in the summary card
    const labelEnero = page.locator('[data-testid="resumen-mensual"]').getByText(/Enero/i).first();
    await expectVisible(labelEnero, 'Month label updated to Enero');

    await showPhaseLabel(page, '✅ Selectors Functional');
  });

  test('total facturado card shows valid currency (no NaN)', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '💰 Phase 1: Check Total Card');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    const totalCard = page.locator('[data-testid="total-facturado-mes"]');
    await expectVisible(totalCard, 'Total Facturado card visible');

    const totalText = await totalCard.textContent();
    expect(totalText).toBeTruthy();

    // Must not contain NaN or undefined
    expect(totalText).not.toContain('NaN');
    expect(totalText).not.toContain('undefined');

    // Must start with currency symbol
    expect(totalText?.trim()).toMatch(/^\$/);

    await showPhaseLabel(page, '✅ Total Facturado Valid');
  });

  test('facturas emitidas count is a valid number', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔢 Phase 1: Check Count Card');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    const countCard = page.locator('[data-testid="count-facturas-mes"]');
    await expectVisible(countCard, 'Facturas Emitidas count visible');

    const countText = await countCard.textContent();
    expect(countText).toBeTruthy();
    expect(countText).not.toContain('NaN');
    expect(countText).not.toContain('undefined');

    // Must be a number (0 or more)
    const count = parseInt(countText?.trim() ?? '', 10);
    expect(count).toBeGreaterThanOrEqual(0);

    await showPhaseLabel(page, '✅ Count Valid');
  });

  test('"Solo facturas con IVA" badge is visible (notas excluded)', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🏷️ Phase 1: IVA Badge');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    const ivaBadge = page.getByText(/Solo facturas con IVA/i).first();
    await expectVisible(ivaBadge, '"Solo facturas con IVA" badge visible');

    await showPhaseLabel(page, '✅ IVA Badge Visible');
  });

  test('changing year selector updates the display', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📆 Phase 1: Change Year');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    const anioSelect = page.getByRole('combobox', { name: /seleccionar año/i });
    await expectVisible(anioSelect, 'Año selector visible');

    // Change to 2024
    await anioSelect.selectOption({ value: '2024' });
    await page.waitForTimeout(300);

    // "2024" should appear in the resumen section
    const label2024 = page.locator('[data-testid="resumen-mensual"]').getByText(/2024/).first();
    await expectVisible(label2024, 'Year label updated to 2024');

    // Empty state message for a year with no data
    const emptyMsg = page
      .locator('[data-testid="resumen-mensual"]')
      .getByText(/No hay facturas formales/i)
      .first();
    // May or may not be visible depending on data — just verify it doesn't crash
    const isEmpty = await emptyMsg.isVisible().catch(() => false);
    const totalCard = page.locator('[data-testid="total-facturado-mes"]');
    const hasTotal = await totalCard.isVisible().catch(() => false);
    expect(isEmpty || hasTotal).toBe(true);

    await showPhaseLabel(page, '✅ Year Change Works');
  });
});
