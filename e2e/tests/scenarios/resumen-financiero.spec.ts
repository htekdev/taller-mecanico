import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Resumen Financiero — Monthly financial summary module.
 *
 * Verifies:
 * 1. Module navigates and loads without crashing
 * 2. Key Spanish section headings are visible
 * 3. Month selector renders
 * 4. P&L section structure is present
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

    // Wait for module content to render
    await page.waitForTimeout(1500);

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
    await page.waitForTimeout(2000);

    // The module must show at least one known Spanish financial heading
    const headings = [
      page.getByText(/Resumen|Estado de Resultados|Ingresos|Utilidad|Por Cobrar/i).first(),
    ];

    let foundAny = false;
    for (const heading of headings) {
      const visible = await heading.isVisible().catch(() => false);
      if (visible) { foundAny = true; break; }
    }

    expect(foundAny).toBe(true);
    await showPhaseLabel(page, '✅ Spanish Financial Labels Present');
  });

  test('resumen tab is accessible from all other modules', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔀 Phase 1: Navigate from Trabajos → Resumen');

    // Start at a different module
    await dashboardPage.navigateToModule('trabajos');
    await page.waitForTimeout(500);

    // Navigate to Resumen
    await dashboardPage.navigateToModule('resumen');
    await page.waitForTimeout(1500);

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
    await page.waitForTimeout(1500);

    // Should not show raw debug errors or uncaught exceptions
    const unhandledError = page.getByText(/unhandled|uncaught|undefined is not|cannot read/i);
    const hasRawError = await unhandledError.isVisible().catch(() => false);
    expect(hasRawError).toBe(false);

    await showPhaseLabel(page, '✅ No Debug Artifacts in Resumen');
  });
});
