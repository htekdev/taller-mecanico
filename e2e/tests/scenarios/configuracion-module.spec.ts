import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Configuración — Settings, taller members, and invite management.
 *
 * Verifies:
 * 1. Module navigates and loads without crashing
 * 2. Settings heading visible in Spanish (content-specific — not nav tab label)
 * 3. Members or invite sections are rendered
 * 4. Module is reachable from other tabs
 */

test.describe('Configuración', () => {
  test.describe.configure({ retries: 1 });
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('configuracion module loads without crash', async ({
    page, dashboardPage,
  }) => {
    test.slow(); // Supabase cold-start: navigateToModule can take 3+ min
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

    // Use text that ONLY appears in the configuracion content, not in nav tab labels.
    // Nav tab label is "Configuración" — use more specific content headings.
    // Actual h2: "⚙️ Configuración del Taller" | h3: "👥 Miembros del Taller"
    const possibleHeadings = [
      page.getByText(/Configuración del Taller/i).first(),
      page.getByText(/Miembros del Taller/i).first(),
      page.getByText(/Invitar Miembro/i).first(),
      page.getByText(/Invitaciones Pendientes/i).first(),
    ];

    let foundAny = false;
    for (const heading of possibleHeadings) {
      const visible = await heading.isVisible().catch(() => false);
      if (visible) { foundAny = true; break; }
    }

    expect(foundAny, 'At least one settings heading must be visible in configuracion content').toBe(true);
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
    await dashboardPage.waitForPageLoad();

    await dashboardPage.navigateToModule('configuracion');
    await dashboardPage.waitForPageLoad();

    const tab = dashboardPage.getTabLocator('configuracion');
    await expectVisible(tab, 'Configuración tab in nav');

    await showPhaseLabel(page, '✅ Configuración Reachable from Inventario');
  });
});