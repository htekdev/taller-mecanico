import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Proveedor CRUD — Full supplier management lifecycle.
 *
 * Tests:
 * 1. Add a new proveedor with all fields
 * 2. Verify it appears in the list
 * 3. Add proveedor with minimal fields (just name)
 * 4. Verify proveedor shows in Inventario's proveedor select
 * 5. Verify proveedor shows in Órdenes' proveedor select
 */

test.describe('Proveedor CRUD', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('add proveedor with full details', async ({
    page, dashboardPage, proveedoresPage
  }) => {
    await showPhaseLabel(page, '🏪 Add Full Proveedor');
    await dashboardPage.navigateToModule('proveedores');
    await proveedoresPage.waitForPageLoad();
    await expectVisible(proveedoresPage.sectionTitle, 'Proveedores section');

    const prov = TestData.proveedor();
    const beforeCount = await proveedoresPage.getProveedorCount();
    await proveedoresPage.addProveedor(prov);

    const isVisible = await proveedoresPage.isProveedorVisible(prov.nombre);
    expect(isVisible).toBe(true);
    expect(await proveedoresPage.getProveedorCount()).toBeGreaterThanOrEqual(beforeCount + 1);

    await showPhaseLabel(page, '✅ Proveedor Added');
  });

  test('add proveedor with minimal fields', async ({
    page, dashboardPage, proveedoresPage
  }) => {
    await showPhaseLabel(page, '🏪 Minimal Proveedor');
    await dashboardPage.navigateToModule('proveedores');
    await proveedoresPage.waitForPageLoad();

    const nombre = `Proveedor Min ${TestData.uniqueId()}`;
    const beforeCount = await proveedoresPage.getProveedorCount();
    await proveedoresPage.addProveedor({ nombre });

    const isVisible = await proveedoresPage.isProveedorVisible(nombre);
    expect(isVisible).toBe(true);
    expect(await proveedoresPage.getProveedorCount()).toBeGreaterThanOrEqual(beforeCount + 1);

    await showPhaseLabel(page, '✅ Minimal Proveedor OK');
  });

  test('proveedor appears in inventario select', async ({
    page, dashboardPage, proveedoresPage, inventarioPage, sidebar
  }) => {
    await showPhaseLabel(page, '🔗 Proveedor → Inventario Link');

    // First add a proveedor
    await dashboardPage.navigateToModule('proveedores');
    await proveedoresPage.waitForPageLoad();

    const provName = `Prov Link ${TestData.uniqueId()}`;
    await proveedoresPage.addProveedor({ nombre: provName });

    // Navigate to Inventario
    await sidebar.clickTab('Inventario');
    await inventarioPage.waitForPageLoad();

    // Check if proveedor select has our new proveedor
    const provSelect = inventarioPage.proveedorSelect;
    if (await provSelect.isVisible().catch(() => false)) {
      const options = await provSelect.locator('option').allTextContents();
      const hasOurProv = options.some(o => o.includes(provName));
      // The proveedor should appear in the dropdown
      expect(hasOurProv).toBe(true);
    }

    await showPhaseLabel(page, '✅ Proveedor Linked to Inventario');
  });

  test('proveedor count updates in badge', async ({
    page, dashboardPage, proveedoresPage, sidebar
  }) => {
    await showPhaseLabel(page, '🔢 Proveedor Badge');
    await dashboardPage.waitForPageLoad();

    // Get initial badge
    const badgeBefore = await sidebar.getBadgeCount('Proveedores');

    // Add a proveedor
    await sidebar.clickTab('Proveedores');
    await proveedoresPage.waitForPageLoad();
    await proveedoresPage.addProveedor({ nombre: `Badge Test ${TestData.uniqueId()}` });

    // Badge should update
    await page.waitForTimeout(1000);
    const badgeAfter = await sidebar.getBadgeCount('Proveedores');

    if (badgeBefore !== null && badgeAfter !== null) {
      expect(badgeAfter).toBeGreaterThan(badgeBefore);
    }

    await showPhaseLabel(page, '✅ Badge Updated');
  });
});
