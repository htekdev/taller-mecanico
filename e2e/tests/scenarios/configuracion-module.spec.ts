import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Configuración — Settings, taller members, and invite management.
 *
 * Verifies:
 * 1. Module navigates and loads without crashing
 * 2. Settings heading visible in Spanish (scoped to main content — not nav tab)
 * 3. Members or invite sections are rendered
 * 4. Module is reachable from other tabs
 */

test.describe('Configuración', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('configuracion module loads without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '⚙️ Phase 1: Navigate to Configuración');
    await dashboardPage.navigateToModule('configuracion');
    await dashboardPage.waitForPageLoad();

    // No fatal crash state
    const errorText = page.getByText(/error al cargar|algo salió mal|fatal error/i);
    const hasError = await errorText.isVisible().catch(() => false);
    expect(hasError).toBe(false);

    // App shell still intact
    await expectVisible(dashboardPage.nav, 'Nav present after loading Configuración');

    await showPhaseLabel(page, '✅ Configuración Module Loaded');
  });

  test('configuracion shows settings heading in Spanish', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔍 Phase 1: Check Spanish Heading');
    await dashboardPage.navigateToModule('configuracion');
    await dashboardPage.waitForPageLoad();

    // Accept any expected Spanish heading in the main content area.
    // Scope to 'main' to avoid false-positive match on the "Configuración" nav tab label.
    const mainContent = page.locator('main');
    const possibleHeadings = [
      mainContent.getByText(/Miembros/i).first(),
      mainContent.getByText(/Equipo/i).first(),
      mainContent.getByText(/Taller/i).first(),
      mainContent.getByText(/Ajustes/i).first(),
      mainContent.getByText(/Configuración del Taller|Configuración General/i).first(),
    ];

    let foundAny = false;
    for (const heading of possibleHeadings) {
      const visible = await heading.isVisible().catch(() => false);
      if (visible) { foundAny = true; break; }
    }

    expect(foundAny, 'At least one settings heading must be visible in main content').toBe(true);
    await showPhaseLabel(page, '✅ Spanish Heading Visible');
  });

  test('configuracion shows members or invite section', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '👥 Phase 1: Check Members/Invite Section');
    await dashboardPage.navigateToModule('configuracion');
    await dashboardPage.waitForPageLoad();

    // Should render some form of team/member UI
    const memberKeywords = [
      page.getByText(/Miembros|Equipo|Invitar|Mecánicos|Propietario|rol/i).first(),
    ];

    let foundAny = false;
    for (const kw of memberKeywords) {
      const visible = await kw.isVisible().catch(() => false);
      if (visible) { foundAny = true; break; }
    }

    // If the module has any content, the section should show
    expect(foundAny).toBe(true);
    await showPhaseLabel(page, '✅ Members/Invite Section Present');
  });

  test('configuracion does not expose raw debug errors', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔒 Phase 1: No Debug Artifacts');
    await dashboardPage.navigateToModule('configuracion');
    await dashboardPage.waitForPageLoad();

    const unhandledError = page.getByText(/unhandled|uncaught|undefined is not|cannot read property/i);
    const hasRawError = await unhandledError.isVisible().catch(() => false);
    expect(hasRawError).toBe(false);

    await showPhaseLabel(page, '✅ No Debug Artifacts in Configuración');
  });

  test('configuracion is reachable from inventario tab', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔀 Phase 1: Navigate Inventario → Configuración');

    await dashboardPage.navigateToModule('inventario');
    await page.waitForTimeout(500);

    await dashboardPage.navigateToModule('configuracion');
    await dashboardPage.waitForPageLoad();

    const tab = dashboardPage.getTabLocator('configuracion');
    await expectVisible(tab, 'Configuración tab in nav');

    await showPhaseLabel(page, '✅ Configuración Reachable from Inventario');
  });
});