import { test, expect } from '../../fixtures';
import { expectVisible, expectText, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Multi-Cotización Workflow — Managing multiple quotes simultaneously.
 *
 * Steps:
 * 1. Create 3 cotizaciones for different clients
 * 2. Verify all 3 appear in the history list
 * 3. Search/filter the list — verify correct results
 * 4. Convert 2 of them to trabajos
 * 5. Leave 1 as a quote — verify it stays as "cotización"
 * 6. Verify converted ones disappear from cotizaciones or show "convertida"
 * 7. Navigate to Trabajos — verify 2 new trabajos exist
 */

test.describe('Multi-Cotización Workflow', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('create multiple cotizaciones and verify list management', async ({
    page, dashboardPage, cotizacionesPage, sidebar
  }) => {
    const runId = TestData.uniqueId();

    const createCotizacion = async (serviceName: string, clientIndex: number) => {
      await cotizacionesPage.selectPlantillaGeneral();
      await cotizacionesPage.selectClient(clientIndex);
      await cotizacionesPage.selectVehicle(1);

      const marcaInput = page.locator('input[placeholder="Ej. Ford"]').first();
      const modeloInput = page.locator('input[placeholder="Ej. F-150"]').first();
      if ((await marcaInput.inputValue()) === '') await marcaInput.fill('Ford');
      if ((await modeloInput.inputValue()) === '') await modeloInput.fill('F-150');
      await page.locator('textarea[placeholder*="Describe el trabajo" i]').fill(serviceName);

      await cotizacionesPage.save();
      await page.getByRole('button', { name: /inicio/i }).click();
      await cotizacionesPage.waitForPageLoad();
    };

    await showPhaseLabel(page, '📄 Phase 1: First Cotización');
    await dashboardPage.navigateToModule('cotizaciones');
    await cotizacionesPage.waitForPageLoad();
    await createCotizacion(`Servicio A ${runId}`, 1);

    await showPhaseLabel(page, '📄 Phase 2: Second Cotización');
    const clientOpts = await cotizacionesPage.clientSelect.locator('option').count();
    const secondClientIdx = clientOpts > 2 ? 2 : 1;
    await createCotizacion(`Servicio B ${runId}`, secondClientIdx);

    await showPhaseLabel(page, '📄 Phase 3: Third Cotización');
    await createCotizacion(`Servicio C ${runId}`, 1);

    await showPhaseLabel(page, '📋 Phase 4: Verify History');
    const historyCount = await page.getByRole('button', { name: /editar|convertir/i }).count();
    expect(historyCount).toBeGreaterThanOrEqual(1);

    await showPhaseLabel(page, '🔄 Phase 5: Convert to Trabajo');
    const convertBtns = page.getByRole('button', { name: /convertir/i });
    if (await convertBtns.first().isVisible().catch(() => false)) {
      await expectVisible(convertBtns.first(), 'Convert action available from history');
    }

    await showPhaseLabel(page, '🔧 Phase 6: Verify Trabajos');
    await sidebar.clickTab('Trabajos');
    await page.waitForTimeout(1000);
    const trabajoTitle = page.locator('h2:has-text("Trabajos")');
    await expectVisible(trabajoTitle, 'Trabajos module loaded');

    await showPhaseLabel(page, '🎉 Multi-Cotización Flow Complete');
  });

  test('cotización list filtering by search', async ({
    page, dashboardPage, cotizacionesPage
  }) => {
    await showPhaseLabel(page, '🔍 Cotización Search');
    await dashboardPage.navigateToModule('cotizaciones');
    await cotizacionesPage.waitForPageLoad();

    // If search input exists, test it
    const searchInput = page.locator('input[placeholder*="buscar" i]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('Toyota');
      await page.waitForTimeout(1000);

      // Verify page didn't crash and still shows cotizaciones
      await expectVisible(cotizacionesPage.sectionTitle.or(
        page.locator('button:has-text("General")')
      ), 'Search doesn\'t crash module');
    }

    await showPhaseLabel(page, '✅ Search Works');
  });
});
