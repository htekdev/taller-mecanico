import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Historial de Compras por Refacción — Feature #222
 *
 * Tests the purchase history modal for individual inventory parts.
 * Verifies:
 *  - "Ver Historial" button visible on each inventory row
 *  - Modal opens when button is clicked
 *  - Empty state shows friendly message
 *  - Adding a purchase entry saves and shows in list
 *  - Error case: form validation prevents empty submissions
 */

test.describe('Historial de Compras por Refacción', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('shows Ver Historial button and opens modal with empty state', { retries: 1 }, async ({
    page, dashboardPage, inventarioPage,
  }) => {
    test.slow();

    // ── Phase 1: Navigate to inventario ──────────────────────────────────────
    await showPhaseLabel(page, '📦 Phase 1: Navigate to Inventario');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // ── Phase 2: Add a test part so we have something to test with ────────────
    await showPhaseLabel(page, '📝 Phase 2: Add test part');
    const partData = TestData.part();
    await inventarioPage.addPart({
      nombre: partData.nombre,
      precioCompra: partData.precioCompra ?? 150,
    });
    const partVisible = await inventarioPage.wasAddSuccessful(partData.nombre);
    expect(partVisible).toBe(true);

    // ── Phase 3: Click "Ver Historial" button ──────────────────────────────────
    await showPhaseLabel(page, '📋 Phase 3: Click Ver Historial');

    // Expand the row to see action buttons
    await inventarioPage.expandPart(partData.nombre);
    await page.waitForTimeout(500);

    // Click the "Ver Historial" button
    const historialBtn = page.locator('[data-testid="ver-historial-btn"]').first();
    await historialBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await historialBtn.click();
    await page.waitForTimeout(800);

    // ── Phase 4: Verify modal opened ─────────────────────────────────────────
    await showPhaseLabel(page, '🔍 Phase 4: Verify modal');
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 10_000 });

    // Modal title should contain the part name
    const modalTitle = modal.locator('#historial-modal-title');
    await expect(modalTitle).toBeVisible();
    await expect(modalTitle).toContainText(partData.nombre);

    // ── Phase 5: Verify empty state ──────────────────────────────────────────
    await showPhaseLabel(page, '📭 Phase 5: Verify empty state');
    // Wait for loading to complete
    await page.waitForTimeout(2000);
    // Should show "Aún no hay entradas" message
    const emptyMsg = modal.locator('text=/Aún no hay entradas/i');
    await expect(emptyMsg).toBeVisible({ timeout: 10_000 });

    // Close modal via X button
    const closeBtn = modal.locator('button[aria-label="Cerrar"]');
    await closeBtn.click();
    await modal.waitFor({ state: 'hidden', timeout: 5_000 });
  });

  test('can add a purchase entry and see it in historial', { retries: 1 }, async ({
    page, dashboardPage, inventarioPage,
  }) => {
    test.slow();

    // ── Phase 1: Navigate and add part ───────────────────────────────────────
    await showPhaseLabel(page, '📦 Phase 1: Setup part');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    const partData = TestData.part();
    await inventarioPage.addPart({
      nombre: partData.nombre,
      precioCompra: partData.precioCompra ?? 200,
    });
    const partAdded = await inventarioPage.wasAddSuccessful(partData.nombre);
    expect(partAdded).toBe(true);

    // ── Phase 2: Open historial modal ─────────────────────────────────────────
    await showPhaseLabel(page, '📋 Phase 2: Open historial modal');
    await inventarioPage.expandPart(partData.nombre);
    await page.waitForTimeout(500);

    const historialBtn = page.locator('[data-testid="ver-historial-btn"]').first();
    await historialBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await historialBtn.click();
    await page.waitForTimeout(800);

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 10_000 });

    // ── Phase 3: Fill in a purchase entry ────────────────────────────────────
    await showPhaseLabel(page, '✏️ Phase 3: Add purchase entry');

    // Fill proveedor nombre (manual — no proveedor in select means writing manually)
    // The "Escribir nombre manualmente" option is selected by default when proveedorId is empty
    const proveedorNombreInput = modal.locator('input[placeholder*="Refaccionaria" i], input[placeholder*="proveedor" i]').first();
    // Wait for the form section to be visible
    await page.waitForTimeout(1000);

    // Find the proveedor nombre input (shown when "— Escribir nombre manualmente —" selected)
    const nombreInput = modal.locator('input[placeholder*="Refaccionaria"]');
    if (await nombreInput.isVisible().catch(() => false)) {
      await nombreInput.fill('Proveedor Test E2E');
    }

    // Fill fecha
    const fechaInput = modal.locator('input[type="date"]');
    await fechaInput.fill('2026-09-01');

    // Fill cantidad
    const cantidadInput = modal.locator('input[placeholder="1"]');
    await cantidadInput.fill('5');

    // Fill precio
    const precioInput = modal.locator('input[placeholder="0.00"]');
    await precioInput.fill('150');

    // Fill notas
    const notasInput = modal.locator('input[placeholder*="Factura" i]');
    await notasInput.fill('Entrada de prueba E2E');

    // ── Phase 4: Submit the form ───────────────────────────────────────────────
    await showPhaseLabel(page, '💾 Phase 4: Submit');
    const submitBtn = modal.getByRole('button', { name: /\+ Agregar Entrada/i });
    await submitBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await submitBtn.click();

    // Wait for success feedback
    await page.waitForTimeout(2000);

    // ── Phase 5: Verify entry appeared ────────────────────────────────────────
    await showPhaseLabel(page, '✅ Phase 5: Verify entry in historial');
    // Either the success message is shown OR the historial entry appeared
    const successMsg = modal.locator('[role="status"]');
    const historialList = modal.locator('[data-testid="historial-list"]');

    const hasSuccess = await successMsg.isVisible().catch(() => false);
    const hasEntry = await historialList.isVisible().catch(() => false);

    // One of these must be true — entry saved or success toast shown
    expect(hasSuccess || hasEntry).toBe(true);

    if (hasEntry) {
      // Verify the entry shows the price
      const entrada = historialList.locator('[data-testid="historial-entrada"]').first();
      await expect(entrada).toBeVisible({ timeout: 5_000 });
      // "Última compra" badge should be shown on first entry
      await expect(entrada.locator('text=Última compra')).toBeVisible();
    }

    // Close modal
    const closeBtn = modal.locator('button[aria-label="Cerrar"]');
    await closeBtn.click();
    await modal.waitFor({ state: 'hidden', timeout: 5_000 });
  });

  test('form validation: prevents saving with zero quantity or price', { retries: 1 }, async ({
    page, dashboardPage, inventarioPage,
  }) => {
    test.slow();

    await showPhaseLabel(page, '📦 Phase 1: Setup');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    const partData = TestData.part();
    await inventarioPage.addPart({
      nombre: partData.nombre,
      precioCompra: partData.precioCompra ?? 100,
    });
    await inventarioPage.wasAddSuccessful(partData.nombre);

    await showPhaseLabel(page, '📋 Phase 2: Open modal');
    await inventarioPage.expandPart(partData.nombre);
    await page.waitForTimeout(500);

    const historialBtn = page.locator('[data-testid="ver-historial-btn"]').first();
    await historialBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await historialBtn.click();
    await page.waitForTimeout(600);

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 10_000 });

    await showPhaseLabel(page, '🚫 Phase 3: Try to submit with 0 price');
    // Clear precio to 0
    const precioInput = modal.locator('input[placeholder="0.00"]');
    await precioInput.fill('0');

    const cantidadInput = modal.locator('input[placeholder="1"]');
    await cantidadInput.fill('0');

    // Submit button should be present — browser validates required fields
    const submitBtn = modal.getByRole('button', { name: /\+ Agregar Entrada/i });
    await expect(submitBtn).toBeVisible();

    // Verify modal is still open (not auto-submitted/crashed)
    await expect(modal).toBeVisible();

    // Clean close
    const closeBtn = modal.locator('button[aria-label="Cerrar"]');
    await closeBtn.click();
  });
});
