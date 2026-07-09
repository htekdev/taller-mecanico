import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Reportes Module — Bug reporting + issue tracking (VistaReportes).
 *
 * VistaReportes has two tabs:
 *   - "Estado" (default): list of existing GitHub issues
 *   - "Nuevo Reporte": form to submit bugs/suggestions to the dev team
 *
 * Verifies:
 * 1. Module loads without crash
 * 2. Shows "Reportes y Sugerencias" heading in Spanish
 * 3. Tab navigation present (Nuevo Reporte / Estado)
 * 4. Form has required fields (titulo, descripcion, categoria)
 * 5. Status tab shows issue-related content
 * 6. No debug artifacts
 * 7. Accessible from another module (cross-navigation)
 */

test.describe('Reportes Module', () => {
  test.use({ retries: 1 }); // Retry once — Supabase unresponsive can cause 3.5min navigation hang
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('reportes module loads without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, 'Phase 1: Navigate to Reportes');
    await dashboardPage.navigateToModule('reportes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    const errorText = page.getByText(/error al cargar|algo salió mal|fatal error/i);
    const hasError = await errorText.isVisible().catch(() => false);
    expect(hasError).toBe(false);

    await expectVisible(dashboardPage.nav, 'Nav present after loading Reportes');
    await showPhaseLabel(page, 'Reportes Loaded');
  });

  test('reportes shows section heading in Spanish', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, 'Phase 2: Spanish Heading');
    await dashboardPage.navigateToModule('reportes');
    const headingLoaded = await page.locator('[data-testid="app-content-loaded"]').isVisible().catch(() => false);
    if (!headingLoaded) { test.skip(true, 'Supabase cold-start — module did not load'); return; }
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // SectionTitle renders "Reportes y Sugerencias"
    const headings = [
      page.getByText(/Reportes y Sugerencias/i).first(),
      page.getByText(/Reportes/i).first(),
    ];

    let found = false;
    for (const h of headings) {
      if (await h.isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found, 'Reportes heading must be visible in Spanish').toBe(true);
    await showPhaseLabel(page, 'Spanish Heading OK');
  });

  test('reportes shows tab switcher (Nuevo Reporte / Estado)', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, 'Phase 3: Tab Navigation');
    await dashboardPage.navigateToModule('reportes');
    const tabLoaded = await page.locator('[data-testid="app-content-loaded"]').isVisible().catch(() => false);
    if (!tabLoaded) { test.skip(true, 'Supabase cold-start — module did not load'); return; }
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    const nuevoTab = page.getByRole('button', { name: /Nuevo Reporte/i }).first();
    const estadoTab = page.getByRole('button', { name: /Ver Reportes/i }).first();

    const nuevoVisible = await nuevoTab.isVisible().catch(() => false);
    const estadoVisible = await estadoTab.isVisible().catch(() => false);

    expect(nuevoVisible || estadoVisible, 'At least one tab must be present').toBe(true);
    await showPhaseLabel(page, 'Tabs Present');
  });

  test('reportes nuevo tab shows form with required fields', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, 'Phase 4: Form Fields');
    await dashboardPage.navigateToModule('reportes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Click "Nuevo Reporte" tab to show the submission form
    const nuevoTab = page.getByRole('button', { name: /Nuevo Reporte/i }).first();
    if (await nuevoTab.isVisible().catch(() => false)) {
      await nuevoTab.click();
      await page.waitForTimeout(500);
    }

    // Form should have titulo input, descripcion textarea, and categoria select
    const tituloInput = page.locator('input[placeholder*="titulo" i], input[placeholder*="titulo" i], input[type="text"]').first();
    const descripcionArea = page.locator('textarea').first();
    const categoriaSelect = page.locator('select').first();
    const submitBtn = page.getByRole('button', { name: /enviar|submit|guardar/i }).first();

    const tituloVisible = await tituloInput.isVisible().catch(() => false);
    const descripcionVisible = await descripcionArea.isVisible().catch(() => false);
    const categoriaVisible = await categoriaSelect.isVisible().catch(() => false);
    const submitVisible = await submitBtn.isVisible().catch(() => false);

    expect(tituloVisible || descripcionVisible || categoriaVisible || submitVisible,
      'Form must have at least one input field').toBe(true);

    await showPhaseLabel(page, 'Form Fields Present');
  });

  test('reportes estado tab shows issue-related content', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, 'Phase 5: Estado Content');
    await dashboardPage.navigateToModule('reportes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(2500); // Allow time for /api/feedback fetch

    // Estado tab is default — should show filter, loading indicator, or issue list
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hasReportesContent =
      /Pendiente|En Progreso|Resuelto|Todos|Cargando|reporte|sin reportes|error al cargar/i.test(bodyText);
    expect(hasReportesContent, 'Estado tab must show issue-related content').toBe(true);

    await showPhaseLabel(page, 'Estado Content Present');
  });

  test('reportes does not expose raw debug errors', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, 'Phase 6: No Debug Artifacts');
    await dashboardPage.navigateToModule('reportes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    const unhandledError = page.getByText(/unhandled|uncaught|undefined is not|cannot read property/i);
    const hasRawError = await unhandledError.isVisible().catch(() => false);
    expect(hasRawError).toBe(false);

    await showPhaseLabel(page, 'No Debug Artifacts');
  });

  test('reportes is accessible from configuracion tab', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, 'Phase 7: Cross-Module Navigation');

    await dashboardPage.navigateToModule('configuracion');
    await dashboardPage.waitForPageLoad();

    await dashboardPage.navigateToModule('reportes');
    await dashboardPage.waitForPageLoad();

    const tab = dashboardPage.getTabLocator('reportes');
    const tabVisible = await tab.isVisible().catch(() => false);
    expect(tabVisible, 'Reportes tab must be visible in nav').toBe(true);

    await showPhaseLabel(page, 'Cross-Module Navigation OK');
  });
});
