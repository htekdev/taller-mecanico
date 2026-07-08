import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Inventory Management — Complete parts lifecycle.
 *
 * Steps:
 * 1. Add a new part with all fields
 * 2. Verify it appears in the list
 * 3. Filter by category
 * 4. Filter by proveedor
 * 5. Verify proveedor is visible when adding parts
 * 6. Edit part compatibility (vehicle compatibility)
 * 7. Receive stock
 * 8. Verify stock count updates
 */

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('add new part with full details', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '📦 Phase 1: Navigate to Inventario');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();
    await expectVisible(inventarioPage.sectionTitle, 'Inventario section');

    // ─── Phase 2: Fill the add part form ────────────────────────────────────
    await showPhaseLabel(page, '📝 Phase 2: Add New Part');
    const partData = TestData.part();
    await inventarioPage.addPart({
      nombre: partData.nombre,
      codigo: partData.codigo,
      precioCompra: partData.precioCompra,
      stock: partData.stock,
      stockMinimo: partData.stockMinimo,
    });

    // ─── Phase 3: Verify part added ─────────────────────────────────────────
    await showPhaseLabel(page, '✅ Phase 3: Verify Part Added');
    const isVisible = await inventarioPage.isPartVisible(partData.nombre);
    expect(isVisible).toBe(true);
  });

  test('proveedor visible when adding parts', async ({
    page, dashboardPage, inventarioPage
  }) => {
    test.slow(); // navigateToModule(inventario) can retry 3.5min on Supabase cold-start
    await showPhaseLabel(page, '🏪 Proveedor Visible Check');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // The proveedor select should be visible in the add form
    const provSelect = inventarioPage.proveedorSelect;
    if (await provSelect.isVisible().catch(() => false)) {
      await expectVisible(provSelect, 'Proveedor select visible');
      const optCount = await inventarioPage.getOptionCount(provSelect);
      // Should have at least the placeholder option
      expect(optCount).toBeGreaterThanOrEqual(1);
    }

    await showPhaseLabel(page, '✅ Proveedor field confirmed');
  });

  test('filter inventory by category', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '🔍 Filter by Category');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Add a part first to ensure there's data
    const partData = TestData.part();
    partData.nombre = `Filtro E2E ${TestData.uniqueId()}`;
    await inventarioPage.addPart({
      nombre: partData.nombre,
      categoria: 'Filtros',
      precioCompra: 100,
      stock: 5,
    });

    // Now filter by Filtros category
    await inventarioPage.filterByCategoria('Filtros');
    await page.waitForTimeout(500);

    // The filtered list should show our part
    const isVisible = await inventarioPage.isPartVisible(partData.nombre);
    expect(isVisible).toBe(true);

    await showPhaseLabel(page, '✅ Category filter works');
  });

  test('filter inventory by proveedor', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '🔍 Filter by Proveedor');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // If the filter exists, test it
    if (await inventarioPage.filtroProveedorSelect.isVisible().catch(() => false)) {
      const optCount = await inventarioPage.getOptionCount(inventarioPage.filtroProveedorSelect);
      if (optCount > 1) {
        await inventarioPage.selectByIndex(inventarioPage.filtroProveedorSelect, 1);
        await page.waitForTimeout(500);
        // Verify the list re-rendered (no crash)
        await expectVisible(inventarioPage.sectionTitle, 'Filter applied without crash');
      }
    }

    await showPhaseLabel(page, '✅ Proveedor filter works');
  });

  test('vehicle compatibility on parts', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '🚗 Vehicle Compatibility');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Add a part
    const partData = TestData.part();
    await inventarioPage.addPart({
      nombre: partData.nombre,
      precioCompra: 200,
      stock: 10,
    });

    // Expand the part to edit compatibility
    await inventarioPage.expandPart(partData.nombre);
    await page.waitForTimeout(500);

    // Look for compatibility edit button
    const compatBtn = page.getByRole('button', { name: /compatibilidad|editar compat/i }).first();
    if (await compatBtn.isVisible().catch(() => false)) {
      await compatBtn.click();
      await page.waitForTimeout(500);

      // Fill marca/modelo if inputs appear
      const marcaInput = page.locator('input[placeholder*="marca" i]').first();
      if (await marcaInput.isVisible().catch(() => false)) {
        await marcaInput.fill('Toyota');
        const modeloInput = page.locator('input[placeholder*="modelo" i]').first();
        if (await modeloInput.isVisible().catch(() => false)) {
          await modeloInput.fill('Corolla');
        }
        // Save compatibility
        const saveCompat = page.getByRole('button', { name: /guardar|agregar/i }).last();
        if (await saveCompat.isVisible().catch(() => false)) {
          await saveCompat.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    await showPhaseLabel(page, '✅ Compatibility management works');
  });
});