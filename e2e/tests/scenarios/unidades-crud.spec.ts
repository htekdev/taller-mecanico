import { test, expect } from "../../fixtures";
import { showPhaseLabel } from "../visual-assert";
import { TestData } from "../../utils/test-data";

/**
 * Unidades (Vehicle) CRUD — dedicated tests for vehicle management within Clientes.
 *
 * Covers:
 * 1. Adding a vehicle to a client
 * 2. Multiple vehicles per client
 * 3. Trabajos module loads without vehicle-related errors
 * 4. Vehicle form has Spanish placeholders
 */

test.describe("Unidades CRUD", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test("add vehicle to client and verify it appears in vehicle list", async ({
    page, dashboardPage,
  }) => {
    test.slow();
    const runId = TestData.uniqueId();
    const clientName = `Cliente Unidades ${runId}`;
    const placa = `PLK-${runId.slice(0, 3).toUpperCase()}`;

    await showPhaseLabel(page, "Setup: Create test client");
    await dashboardPage.navigateToModule("clientes");
    await page.waitForTimeout(1500);

    await page.locator('input[placeholder="Nombre completo"]').fill(clientName);
    await page.locator('input[type="tel"]').first().fill("555-" + runId.slice(0, 4));
    await page.getByRole("button", { name: /agregar cliente/i }).click();
    await page.waitForTimeout(1500);

    const clientCard = page.getByRole("button", { name: new RegExp(clientName, "i") }).first();
    await expect(clientCard).toBeVisible({ timeout: 10000 });
    await clientCard.click();
    await page.waitForTimeout(800);

    await showPhaseLabel(page, "Add vehicle to client");
    const marcaInput = page.locator('input[placeholder="Ej. Ford"]').first();
    await expect(marcaInput).toBeVisible({ timeout: 5000 });
    await marcaInput.fill("Nissan");
    await page.locator('input[placeholder="Ej. F-150"]').first().fill("Frontier");
    await page.locator('input[placeholder="Ej. 2020"]').first().fill("2019");
    await page.locator('input[placeholder="Ej. ABC-123"]').first().fill(placa);
    await page.getByRole("button", { name: /^\+ Agregar$/ }).click();
    await page.waitForTimeout(1500);

    await showPhaseLabel(page, "Verify vehicle appears in client detail");
    const pageText = await page.locator("body").innerText();
    expect(pageText).toContain("Nissan");
    expect(pageText).toContain("Frontier");
    expect(pageText).toContain(placa);
  });

  test("add multiple vehicles to one client", async ({
    page, dashboardPage,
  }) => {
    test.slow();
    const runId = TestData.uniqueId();
    const clientName = `Multi-Veh ${runId}`;

    await showPhaseLabel(page, "Create client for multiple vehicles");
    await dashboardPage.navigateToModule("clientes");
    await page.waitForTimeout(1500);

    await page.locator('input[placeholder="Nombre completo"]').fill(clientName);
    await page.locator('input[type="tel"]').first().fill("555-" + runId.slice(0, 4));
    await page.getByRole("button", { name: /agregar cliente/i }).click();
    await page.waitForTimeout(1500);

    const clientCard = page.getByRole("button", { name: new RegExp(clientName, "i") }).first();
    await expect(clientCard).toBeVisible({ timeout: 10000 });
    await clientCard.click();
    await page.waitForTimeout(800);

    await showPhaseLabel(page, "Add Vehicle 1: Toyota Corolla");
    const marcaInput = page.locator('input[placeholder="Ej. Ford"]').first();
    await expect(marcaInput).toBeVisible({ timeout: 5000 });
    await marcaInput.fill("Toyota");
    await page.locator('input[placeholder="Ej. F-150"]').first().fill("Corolla");
    await page.locator('input[placeholder="Ej. 2020"]').first().fill("2020");
    await page.locator('input[placeholder="Ej. ABC-123"]').first().fill("TYT-" + runId.slice(0, 3));
    await page.getByRole("button", { name: /^\+ Agregar$/ }).click();
    await page.waitForTimeout(1500);

    await showPhaseLabel(page, "Add Vehicle 2: Honda CR-V");
    await marcaInput.fill("Honda");
    await page.locator('input[placeholder="Ej. F-150"]').first().fill("CR-V");
    await page.locator('input[placeholder="Ej. 2020"]').first().fill("2021");
    await page.locator('input[placeholder="Ej. ABC-123"]').first().fill("HND-" + runId.slice(0, 3));
    await page.getByRole("button", { name: /^\+ Agregar$/ }).click();
    await page.waitForTimeout(1500);

    await showPhaseLabel(page, "Verify both vehicles in list");
    const pageText = await page.locator("body").innerText();
    expect(pageText).toContain("Toyota");
    expect(pageText).toContain("Corolla");
    expect(pageText).toContain("Honda");
    expect(pageText).toContain("CR-V");
  });

  test("trabajos module loads without vehicle-related errors", async ({
    page, dashboardPage,
  }) => {
    test.slow();
    await showPhaseLabel(page, "Navigate to Trabajos module");
    await dashboardPage.navigateToModule("trabajos");
    await page.waitForTimeout(2000);

    const pageText = await page.locator("body").innerText();
    expect(pageText).not.toContain("Error al cargar");
    expect(pageText).not.toContain("undefined");

    // Module title renders in Spanish
    await expect(page.getByText(/trabajos/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("vehicle form fields have correct Spanish placeholder text", async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, "Navigate to Clientes");
    await dashboardPage.navigateToModule("clientes");
    await page.waitForTimeout(1500);

    const runId = TestData.uniqueId();
    await page.locator('input[placeholder="Nombre completo"]').fill("Form Test " + runId);
    await page.locator('input[type="tel"]').first().fill("555-0000");
    await page.getByRole("button", { name: /agregar cliente/i }).click();
    await page.waitForTimeout(1500);

    const clientCard = page.getByRole("button", { name: new RegExp("Form Test", "i") }).first();
    await clientCard.click();
    await page.waitForTimeout(800);

    await showPhaseLabel(page, "Verify Spanish placeholder text on vehicle form");
    await expect(page.locator('input[placeholder="Ej. Ford"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder="Ej. F-150"]').first()).toBeVisible();
    await expect(page.locator('input[placeholder="Ej. 2020"]').first()).toBeVisible();
    await expect(page.locator('input[placeholder="Ej. ABC-123"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^\+ Agregar$/ })).toBeVisible();
  });
});
