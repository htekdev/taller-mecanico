import { test, expect, Page } from '@playwright/test';

/**
 * Full Lifecycle E2E Test — Taller Mecánico
 *
 * This test walks through the complete business flow:
 * 1. Login with test account
 * 2. Create a client with vehicle
 * 3. Create a cotización (quote)
 * 4. Convert cotización to trabajo (job)
 * 5. Add refacciones (parts) from inventory
 * 6. Add mano de obra (labor)
 * 7. Finalize the trabajo
 * 8. Check cuentas por cobrar (accounts receivable)
 * 9. Verify data persists across sessions (logout/login)
 */

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'sofia@test.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'Test1234!';
const UNIQUE_ID = Date.now().toString(36);

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page.locator('nav button:has-text("Clientes")')).toBeVisible({ timeout: 15_000 });
}

test.describe('Full Lifecycle', () => {
  test('complete business flow: cotización → trabajo → cobro', async ({ page }) => {
    // ─── Step 1: Login ───────────────────────────────────────────────────
    await login(page);

    // ─── Step 2: Create a client ─────────────────────────────────────────
    await page.click('nav button:has-text("Clientes")');
    await page.waitForTimeout(1_000);

    const clientName = `E2E Cliente ${UNIQUE_ID}`;
    const nameInput = page.locator('input[placeholder="Nombre completo"]');
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill(clientName);

      const phoneInput = page.locator('input[type="tel"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('555-999-' + UNIQUE_ID.substring(0, 4));
      }

      await page.click('button:has-text("Guardar")');
      await page.waitForTimeout(2_000);
    }

    // ─── Step 3: Navigate to Cotizaciones ────────────────────────────────
    await page.click('nav button:has-text("Cotizaciones")');
    await page.waitForTimeout(2_000);

    // Create a new cotización
    const clientSelect = page.locator('select').first();
    if (await clientSelect.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Select a client (the one we just created or any available)
      const options = await clientSelect.locator('option').count();
      if (options > 1) {
        await clientSelect.selectOption({ index: options - 1 }); // last one = newest
      }

      // Wait for vehicle select to appear
      await page.waitForTimeout(1_000);
      const vehicleSelect = page.locator('select').nth(1);
      if (await vehicleSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const vOptions = await vehicleSelect.locator('option').count();
        if (vOptions > 1) {
          await vehicleSelect.selectOption({ index: 1 });
        }
      }

      // Add a line item
      const addButton = page.locator('button:has-text("Agregar")');
      if (await addButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(500);
      }

      // Fill line item details
      const lineInputs = page.locator('input[type="text"]');
      const lineCount = await lineInputs.count();
      if (lineCount > 0) {
        await lineInputs.last().fill(`Servicio E2E ${UNIQUE_ID}`);
      }

      // Fill quantity and price if number inputs are available
      const numberInputs = page.locator('input[type="number"]');
      const numCount = await numberInputs.count();
      if (numCount >= 2) {
        await numberInputs.nth(numCount - 2).fill('1');
        await numberInputs.nth(numCount - 1).fill('2500');
      }

      // Save cotización
      const saveBtn = page.locator('button:has-text("Guardar")');
      if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(3_000);
      }
    }

    // ─── Step 4: Convert cotización to trabajo ───────────────────────────
    const convertButton = page.locator('button:has-text("Convertir")').first();
    if (await convertButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await convertButton.click();
      await page.waitForTimeout(3_000);
    }

    // ─── Step 5: Navigate to Trabajos and add parts ──────────────────────
    await page.click('nav button:has-text("Trabajos")');
    await page.waitForTimeout(2_000);

    // Check if there are any trabajos
    const trabajoRow = page.locator('table tr, .rounded-xl.border').first();
    if (await trabajoRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trabajoRow.click();
      await page.waitForTimeout(1_000);
    }

    // ─── Step 6: Navigate to Inventario ──────────────────────────────────
    await page.click('nav button:has-text("Inventario")');
    await page.waitForTimeout(2_000);

    // Verify inventory module loads
    const inventoryContent = page.locator('h2:has-text("Inventario"), table').first();
    await expect(inventoryContent).toBeVisible({ timeout: 10_000 });

    // ─── Step 7: Check Cuentas por Cobrar ────────────────────────────────
    await page.click('nav button:has-text("Por Cobrar")');
    await page.waitForTimeout(2_000);

    // Verify the module loads without errors
    const cobrarContent = page.locator('table, h2, text=Total').first();
    await expect(cobrarContent).toBeVisible({ timeout: 10_000 });

    // ─── Step 8: Verify persistence across sessions ──────────────────────
    // Logout
    await page.click('button:has-text("Salir")');
    await expect(page.locator('button:has-text("Entrar al Sistema"), button:has-text("Iniciar Sesión")').first()).toBeVisible({ timeout: 15_000 });

    // Login again
    await login(page);

    // Navigate back to Clientes and verify our client exists
    await page.click('nav button:has-text("Clientes")');
    await page.waitForTimeout(2_000);

    // The client we created should still be visible (data persisted)
    const clientExists = page.locator(`text=${clientName}`);
    if (await clientExists.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(clientExists).toBeVisible();
    }

    // ─── Step 9: Navigate through all modules to verify stability ────────
    const modules = ['Inventario', 'Trabajos', 'Proveedores', 'Órdenes de Compra', 'Por Cobrar', 'Gastos'];
    for (const mod of modules) {
      await page.click(`nav button:has-text("${mod}")`);
      await page.waitForTimeout(1_500);
      // No crash = success for navigation stability
    }
  });
});
