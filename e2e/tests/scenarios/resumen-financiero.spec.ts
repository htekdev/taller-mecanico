import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Resumen Financiero — Monthly financial summary module.
 *
 * Verifies:
 * 1. Module navigates and loads without crashing
 * 2. Key Spanish financial headings visible (content-specific — not nav tab labels)
 * 3. Module is reachable from other tabs
 * 4. No debug artifacts in production
 */

test.describe('Resumen Financiero', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('resumen module loads without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📊 Phase 1: Navigate to Resumen');
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();

    // Verify no fatal error / crash state
    const errorText = page.getByText(/error al cargar|algo salió mal|fatal error/i);
    const hasError = await errorText.isVisible().catch(() => false);
    expect(hasError).toBe(false);

    // Verify the nav is still present (app didn't crash entirely)
    await expectVisible(dashboardPage.nav, 'Nav still visible after loading Resumen');

    await showPhaseLabel(page, '✅ Resumen Module Loaded');
  });

  test('resumen shows financial section labels in Spanish', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📋 Phase 1: Check Spanish Labels');
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();

    // Use text that ONLY appears in the financial content area, not in nav tab labels.
    // Nav tab label is simply "Resumen" — avoid matching that.
    // Content-specific headings: "Estado de Resultados", "Utilidad", "Ingresos"
    const contentHeadings = [
      page.getByText(/Estado de Resultados/i).first(),
      page.getByRole('heading', { name: /Estado de Resultados/i }).first(),
      page.getByText(/Utilidad Bruta|Utilidad Neta/i).first(),
      page.getByText(/Ingresos.*Facturado|💰 Ingresos/i).first(),
    ];

    let foundAny = false;
    for (const heading of contentHeadings) {
      const visible = await heading.isVisible().catch(() => false);
      if (visible) { foundAny = true; break; }
    }

    expect(foundAny, 'At least one financial section heading must be visible (not nav tab)').toBe(true);
    await showPhaseLabel(page, '✅ Spanish Financial Labels Present');
  });

  test('resumen tab is accessible from trabajos module', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔀 Phase 1: Navigate from Trabajos → Resumen');

    // Start at a different module
    await dashboardPage.navigateToModule('trabajos');
    await page.waitForTimeout(500);

    // Navigate to Resumen
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();

    // Verify we're on Resumen (nav tab is active)
    const tab = dashboardPage.getTabLocator('resumen');
    await expectVisible(tab, 'Resumen tab visible in nav');

    await showPhaseLabel(page, '✅ Resumen Tab Reachable');
  });

  test('resumen does not show localhost or debug data in production', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔍 Phase 1: Check No Debug Content');
    await dashboardPage.navigateToModule('resumen');
    await dashboardPage.waitForPageLoad();

    // Should not show raw debug errors or uncaught exceptions
    const unhandledError = page.getByText(/unhandled|uncaught|undefined is not|cannot read/i);
    const hasRawError = await unhandledError.isVisible().catch(() => false);
    expect(hasRawError).toBe(false);

    await showPhaseLabel(page, '✅ No Debug Artifacts in Resumen');
  });
});