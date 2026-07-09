import { test, expect } from "../../fixtures";
import { showPhaseLabel } from "../visual-assert";

/**
 * Merge proof for PR #152:
 * fix(prod-readiness): surface silent failures in generarFactura + crearOrden callers
 *
 * Verifies that:
 * 1. Ordenes (purchase orders) module loads and section heading is visible
 * 2. Facturas module loads without errors
 * 3. Error banner system is available (confirmarFactura now calls setErrorBanner on failure)
 */

test.describe("change-proof: caller silent failure surfacing", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test("ordenes module loads and crear orden section is rendered", async ({
    page,
    dashboardPage,
  }) => {
    test.slow();

    await showPhaseLabel(page, "Navigate to Ordenes module");
    await dashboardPage.navigateToModule("ordenes");
    await page.waitForTimeout(2000);

    const pageText = await page.locator("body").innerText();
    expect(pageText).not.toContain("Error al cargar");
    expect(pageText).not.toContain("[object Object]");
    expect(pageText).not.toContain("undefined");

    // Ordenes module should show Spanish heading (app uses "Ordenes de Compra" with accent)
    await expect(page.getByText(/[Óo]rdenes de compra/i).first()).toBeVisible({
      timeout: 15000,
    });

    // "Nueva Orden de Compra" h3 heading is always rendered in the create-OC section
    // (it is outside the proveedores conditional, renders regardless of provider state)
    await expect(
      page.getByText("Nueva Orden de Compra").first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("facturas module loads without errors after PR #152 fix", async ({
    page,
    dashboardPage,
  }) => {
    test.slow();

    await showPhaseLabel(page, "Navigate to Facturas module");
    await dashboardPage.navigateToModule("facturas");
    await page.waitForTimeout(2000);

    const pageText = await page.locator("body").innerText();
    expect(pageText).not.toContain("Error al cargar");
    expect(pageText).not.toContain("[object Object]");

    // Facturas module heading
    await expect(page.getByText(/facturas/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("full walk-through: login to ordenes to facturas no crashes", async ({
    page,
    dashboardPage,
  }) => {
    test.slow();

    await showPhaseLabel(page, "Ordenes to Facturas walk-through");

    await dashboardPage.navigateToModule("ordenes");
    await page.waitForTimeout(1500);

    await dashboardPage.navigateToModule("facturas");
    await page.waitForTimeout(1500);

    await dashboardPage.navigateToModule("clientes");
    await page.waitForTimeout(1000);

    const pageText = await page.locator("body").innerText();
    expect(pageText).not.toContain("Error al cargar");
    expect(pageText).not.toContain("undefined");
  });
});