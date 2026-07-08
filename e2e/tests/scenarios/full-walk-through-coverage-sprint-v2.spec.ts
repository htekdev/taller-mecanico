import { test, expect } from "../../fixtures";
import { showPhaseLabel } from "../visual-assert";
import { TestData } from "../../utils/test-data";

/**
 * Full Walk-Through — Coverage Sprint V2 (merge proof)
 *
 * Verifies: cotizaciones load, clientes module, unidades form, trabajos module — all in Spanish.
 * Merge-proof spec for the coverage-sprint-cotizaciones-trabajos-helpers branch.
 */

test.describe("Full Walk-Through: Coverage Sprint V2", () => {
  test("full walk-through — clientes, unidades, cotizaciones, trabajos", async ({
    page, dashboardPage, loginPage,
  }) => {
    test.slow();
    const runId = TestData.uniqueId();

    await loginPage.loginAsTestUser();

    // Phase 1: Clientes module loads
    await showPhaseLabel(page, "Phase 1: Clientes module");
    await dashboardPage.navigateToModule("clientes");
    await page.waitForTimeout(1500);
    await expect(page.getByText(/clientes/i).first()).toBeVisible({ timeout: 8000 });
    const clientesText = await page.locator("body").innerText();
    expect(clientesText).not.toContain("Error");

    // Phase 2: Add a client and verify
    await showPhaseLabel(page, "Phase 2: Add test client");
    const clientName = `Sprint V2 ${runId}`;
    await page.locator('input[placeholder="Nombre completo"]').fill(clientName);
    await page.locator('input[type="tel"]').first().fill("555-" + runId.slice(0, 4));
    await page.getByRole("button", { name: /agregar cliente/i }).click();
    await page.waitForTimeout(1500);
    const clientCard = page.getByRole("button", { name: new RegExp(clientName, "i") }).first();
    await expect(clientCard).toBeVisible({ timeout: 10000 });

    // Phase 3: Open client and verify vehicle form exists
    await showPhaseLabel(page, "Phase 3: Unidades form visible");
    await clientCard.click();
    await page.waitForTimeout(800);
    await expect(page.locator('input[placeholder="Ej. Ford"]').first()).toBeVisible({ timeout: 5000 });

    // Phase 4: Cotizaciones module
    await showPhaseLabel(page, "Phase 4: Cotizaciones module");
    await dashboardPage.navigateToModule("cotizaciones");
    await page.waitForTimeout(2000);
    const cotizText = await page.locator("body").innerText();
    expect(cotizText).not.toContain("Error al cargar");
    await expect(page.getByText(/cotizaci/i).first()).toBeVisible({ timeout: 8000 });

    // Phase 5: Trabajos module
    await showPhaseLabel(page, "Phase 5: Trabajos module");
    await dashboardPage.navigateToModule("trabajos");
    await page.waitForTimeout(2000);
    const trabajosText = await page.locator("body").innerText();
    expect(trabajosText).not.toContain("Error al cargar");
    await expect(page.getByText(/trabajos/i).first()).toBeVisible({ timeout: 8000 });

    // Phase 6: Nav bar visible throughout
    await showPhaseLabel(page, "Phase 6: Nav bar visible");
    const navVisible = await dashboardPage.nav.isVisible().catch(() => false);
    expect(navVisible).toBe(true);

    await showPhaseLabel(page, "Coverage Sprint V2 — all phases passed");
  });
});
