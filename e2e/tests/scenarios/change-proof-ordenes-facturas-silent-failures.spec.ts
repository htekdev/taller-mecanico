import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';

/**
 * Change-proof spec: ordenes_compra & facturas error handling
 * PR: fix(prod-readiness): surface silent update failures in ordenes_compra & facturas (#142)
 *
 * Validates that both modules load cleanly and display no NaN/undefined values
 * after adding throw-on-error to 13 db.ts functions (updateOrden, updateFacturaFecha,
 * updateFacturaNumero, updateFacturaConceptos, updateTrabajoTotales,
 * cancelarFactura, reactivarFactura, cancelarNota, reactivarNota, and friends).
 *
 * Tests:
 * 1. ordenes_compra module loads without crash
 * 2. ordenes_compra shows Spanish content (getByText pattern — avoids innerText container issues)
 * 3. ordenes_compra monetary values contain no NaN/undefined
 * 4. facturas module loads without crash
 * 5. facturas monetary values contain no NaN/undefined
 * 6. facturas filter tabs render in Spanish
 */

test.describe('change-proof-ordenes-facturas-silent-failures', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('ordenes_compra module loads without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '📦 Navegando a Órdenes de Compra');
    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    await expectVisible(dashboardPage.nav, 'Nav visible after ordenes load');

    const errorBanner = page
      .locator('.bg-rose-50:has-text("Error"), .text-red-600:has-text("Error")')
      .first();
    const hasCriticalError = await errorBanner.isVisible().catch(() => false);
    expect(hasCriticalError).toBe(false);

    await showPhaseLabel(page, '✅ Órdenes cargó OK');
  });

  test('ordenes_compra shows Spanish content', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🏷️ Revisando etiquetas en Órdenes');
    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    // Use getByText — works regardless of DOM container (avoids innerText on wrong element)
    const spanishTerms = [
      /Órdenes de Compra/i,
      /Orden de Compra/i,
      /Nueva Orden/i,
      /Proveedor/i,
      /Estado/i,
      /No hay órdenes/i,
    ];

    let found = false;
    for (const pattern of spanishTerms) {
      const el = page.getByText(pattern).first();
      if (await el.isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found, 'At least one Spanish ordenes term must be visible').toBe(true);

    await showPhaseLabel(page, '✅ Contenido español OK');
  });

  test('ordenes_compra monetary values contain no NaN or undefined', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '💰 Verificando valores monetarios en Órdenes');
    await dashboardPage.navigateToModule('ordenes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toMatch(/\$undefined|\$null/);

    await showPhaseLabel(page, '✅ Valores OK sin NaN');
  });

  test('facturas module loads without crash', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🧾 Navegando a Facturas');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1000);

    await expectVisible(dashboardPage.nav, 'Nav visible after facturas load');

    const errorBanner = page
      .locator('.bg-rose-50:has-text("Error"), .text-red-600:has-text("Error")')
      .first();
    const hasCriticalError = await errorBanner.isVisible().catch(() => false);
    expect(hasCriticalError).toBe(false);

    await showPhaseLabel(page, '✅ Facturas cargó OK');
  });

  test('facturas monetary values contain no NaN or undefined', async ({
    page, dashboardPage,
  }) => {
    test.slow(); // navigateToModule('facturas') vulnerable to Supabase cold-start
    await showPhaseLabel(page, '💰 Verificando valores en Facturas');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('[object Object]');
    expect(bodyText).not.toMatch(/\$undefined|\$null/);

    await showPhaseLabel(page, '✅ Facturas Values OK sin NaN');
  });

  test('facturas filter tabs and section labels render in Spanish', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🔍 Verificando filtros de Facturas en español');
    await dashboardPage.navigateToModule('facturas');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(1500);

    // Use getByText for reliable Spanish content check (avoids innerText container issues)
    const spanishTerms = [
      /Facturas/i,
      /Factura/i,
      /Pendiente/i,
      /Pagado/i,
      /Nueva Factura/i,
      /No hay facturas/i,
    ];

    let found = false;
    for (const pattern of spanishTerms) {
      const el = page.getByText(pattern).first();
      if (await el.isVisible().catch(() => false)) { found = true; break; }
    }
    expect(found, 'At least one Spanish facturas term must be visible').toBe(true);

    // No English error text
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText).not.toContain('Error loading');
    expect(bodyText).not.toContain('Something went wrong');

    await showPhaseLabel(page, '✅ Filtros en español OK');
  });
});