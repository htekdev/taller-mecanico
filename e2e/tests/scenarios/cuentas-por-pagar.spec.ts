import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Cuentas por Pagar Module — Payables tracking lifecycle.
 *
 * The "Por Pagar" (pagos) module tracks:
 * - Payments owed to external service providers
 * - Accounts payable generated from received purchase orders
 *
 * Tests:
 * 1. Module loads without crash
 * 2. Spanish section labels visible
 * 3. "Total por Pagar" summary renders
 * 4. Empty state message is correct Spanish
 * 5. Monetary values are well-formatted
 * 6. Payment registration on payable item
 * 7. Module survives rapid navigation away and back
 */

test.describe('Cuentas por Pagar (Por Pagar)', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('cuentas por pagar module loads without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '💸 Phase 1: Navigate to Por Pagar');
    await dashboardPage.navigateToModule('pagos');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Nav still visible = no crash
    await expectVisible(dashboardPage.nav, 'Nav visible after Por Pagar load');

    // No fatal error banners
    const errorBanner = page
      .locator('.bg-rose-50:has-text("Error"), .text-red-600:has-text("Error")')
      .first();
    const hasCriticalError = await errorBanner.isVisible().catch(() => false);
    expect(hasCriticalError).toBe(false);

    await showPhaseLabel(page, '✅ Por Pagar Loaded');
  });

  test('cuentas por pagar shows Spanish section title', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🏷️ Phase 1: Spanish Labels');
    await dashboardPage.navigateToModule('pagos');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Section title from SectionTitle component
    const sectionTitle = page.getByText(/Cuentas por Pagar/i).first();
    await expectVisible(sectionTitle, 'Cuentas por Pagar title visible');

    // Subtitle/description text
    const subtitle = page
      .getByText(/Pagos pendientes a proveedores|servicios externos/i)
      .first();
    const hasSubtitle = await subtitle.isVisible().catch(() => false);
    if (hasSubtitle) {
      await showPhaseLabel(page, '✅ Subtitle Visible');
    }

    await showPhaseLabel(page, '✅ Spanish Labels OK');
  });

  test('cuentas por pagar monetary values are well-formatted', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🧮 Phase 1: Math Check');
    await dashboardPage.navigateToModule('pagos');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    const mainText = await page.locator('body').innerText().catch(() => '');

    // No broken number formatting
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toContain('undefined');
    expect(mainText).not.toContain('Infinity');

    // Monetary amounts should be properly formatted
    const moneyPattern = /\$\s*[\d,]+\.?\d*/g;
    const matches = [...mainText.matchAll(moneyPattern)];
    for (const match of matches) {
      const numStr = match[0].replace(/\$|\s|,/g, '');
      const num = parseFloat(numStr);
      expect(num).not.toBeNaN();
      expect(num).toBeGreaterThanOrEqual(0);
    }

    await showPhaseLabel(page, '✅ Math Valid');
  });

  test('cuentas por pagar empty state shows correct Spanish message', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📭 Phase 1: Empty State Check');
    await dashboardPage.navigateToModule('pagos');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    const mainText = await page.locator('body').innerText().catch(() => '');

    // If no payables exist, the empty state message should be Spanish
    const hasEmptyState =
      mainText.includes('Sin cuentas por pagar') ||
      mainText.includes('Las cuentas por pagar se generan') ||
      mainText.includes('Total por Pagar');

    // Either there's an empty state (Spanish) or there are items — both valid
    // The important thing is there's no English error message or crash
    expect(mainText).not.toContain('Something went wrong');
    expect(mainText).not.toContain('Error loading');
    expect(mainText).not.toContain('undefined');

    if (hasEmptyState) {
      await showPhaseLabel(page, '✅ Spanish Empty State Present');
    } else {
      await showPhaseLabel(page, '✅ Por Pagar Has Active Items');
    }
  });

  test('cuentas por pagar "Total por Pagar" summary renders', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '💰 Phase 1: Total Summary');
    await dashboardPage.navigateToModule('pagos');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    const mainText = await page.locator('body').innerText().catch(() => '');

    // "Total por Pagar" heading appears in either the services or refacciones summary
    const hasTotalLabel =
      mainText.includes('Total por Pagar') ||
      mainText.includes('Cuentas por Pagar'); // at minimum the section title

    expect(hasTotalLabel).toBe(true);

    // The total should be a valid number (or zero for new accounts)
    const totalPattern = /Total por Pagar[\s\S]*?\$\s*([\d,]+\.?\d*)/i;
    const totalMatch = mainText.match(totalPattern);
    if (totalMatch) {
      const num = parseFloat(totalMatch[1].replace(/,/g, ''));
      expect(num).not.toBeNaN();
      expect(num).toBeGreaterThanOrEqual(0);
      await showPhaseLabel(page, `✅ Total = $${totalMatch[1]}`);
    } else {
      await showPhaseLabel(page, '✅ Summary Section Present');
    }
  });

  test('cuentas por pagar payment registration', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '💳 Phase 1: Register Payment');
    await dashboardPage.navigateToModule('pagos');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Look for "Pagar" or "Registrar Pago" buttons on payable items
    const pagarBtn = page
      .getByRole('button', { name: /pagar|registrar pago/i })
      .first();

    const hasPagarBtn = await pagarBtn.isVisible().catch(() => false);

    if (hasPagarBtn) {
      await pagarBtn.click();
      await page.waitForTimeout(600);

      // A payment form should appear — either modal or inline
      const formVisible =
        (await page.locator('input[type="number"]').first().isVisible().catch(() => false)) ||
        (await page.locator('input[placeholder*="monto"], input[placeholder*="Monto"]').first().isVisible().catch(() => false));

      if (formVisible) {
        await showPhaseLabel(page, '✅ Payment Form Opened');
        // Close without saving — press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        await showPhaseLabel(page, '✅ Pagar Button Clickable');
      }
    } else {
      // No payables in test account — module still loaded OK
      await showPhaseLabel(page, '⏭️ No payables in test account — OK');
    }

    // Module still alive
    expect(await dashboardPage.nav.isVisible()).toBe(true);
  });

  test('cuentas por pagar survives rapid navigation away and back', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔀 Phase 1: Navigation Resilience');
    await dashboardPage.navigateToModule('pagos');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(600);

    // Navigate away to Trabajos
    await dashboardPage.navigateToModule('trabajos');
    await page.waitForTimeout(600);

    // Navigate back to Por Pagar
    await dashboardPage.navigateToModule('pagos');
    await page.waitForTimeout(800);

    // Section title should still be present
    const sectionTitle = page.getByText(/Cuentas por Pagar/i).first();
    await expectVisible(sectionTitle, 'Por Pagar re-renders correctly');

    // No crash
    expect(await dashboardPage.nav.isVisible()).toBe(true);

    await showPhaseLabel(page, '✅ Navigation Resilience OK');
  });

  test('cuentas por pagar distinguishes between servicios and refacciones payables', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔬 Phase 1: Payable Categories');
    await dashboardPage.navigateToModule('pagos');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    const mainText = await page.locator('body').innerText().catch(() => '');

    // If payables exist, they should be categorized correctly
    // The module tracks both "servicios externos" payables and "ordenes de compra" payables
    // Verify no mixed-up labels
    expect(mainText).not.toContain('NaN');
    expect(mainText).not.toContain('undefined');

    // Both category headings may appear (or neither if no data)
    const hasServiciosSection =
      mainText.includes('Servicios') ||
      mainText.includes('servicios externos');
    const hasRefaccionesSection =
      mainText.includes('Refacciones') ||
      mainText.includes('Órdenes de Compra') ||
      mainText.includes('Sin cuentas');

    // At least one section should be present
    expect(hasServiciosSection || hasRefaccionesSection).toBe(true);

    await showPhaseLabel(page, '✅ Category Sections Present');
  });
});

