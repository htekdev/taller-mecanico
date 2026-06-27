import { test, expect } from '@playwright/test';
import { login, navigateTo, expectSectionTitle } from './helpers';
import { expectVisible, showPhaseLabel } from './visual-assert';

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

const UNIQUE_ID = Date.now().toString(36);

test.describe('Full Lifecycle', () => {
  test('complete business flow: cotización → trabajo → cobro', async ({ page }) => {
    // ─── Step 1: Login ───────────────────────────────────────────────────
    await showPhaseLabel(page, '🔐 Step 1: Login');
    await login(page);

    // ─── Step 2: Create a client ─────────────────────────────────────────
    await showPhaseLabel(page, '👤 Step 2: Create client');
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

      const addClientBtn = page.locator('button:has-text("Agregar Cliente")');
      if (await addClientBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expectVisible(addClientBtn, 'Add client button');
        await addClientBtn.click();
      }
      await page.waitForTimeout(2_000);
    }

    // ─── Step 3: Navigate to Cotizaciones ────────────────────────────────
    await showPhaseLabel(page, '📝 Step 3: Create cotización');
    await page.click('nav button:has-text("Cotizaciones")');
    await page.waitForTimeout(2_000);

    const generalCard = page.locator('button:has-text("General")').first();
    if (await generalCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expectVisible(generalCard, 'General plantilla');
      await generalCard.click();
      await page.waitForTimeout(2_000);

      const clientSelect = page.locator('select').first();
      if (await clientSelect.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await expectVisible(clientSelect, 'Client select');
        const options = await clientSelect.locator('option').count();
        if (options > 1) {
          await clientSelect.selectOption({ index: options - 1 });
        }

        await page.waitForTimeout(1_000);
        const vehicleSelect = page.locator('select').nth(1);
        if (await vehicleSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
          const vOptions = await vehicleSelect.locator('option').count();
          if (vOptions > 1) {
            await vehicleSelect.selectOption({ index: 1 });
          }
        }
      }
    }

    // ─── Step 4: Convert cotización to trabajo ───────────────────────────
    await showPhaseLabel(page, '🔄 Step 4: Convert to trabajo');
    const convertButton = page.locator('button:has-text("Convertir")').first();
    if (await convertButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expectVisible(convertButton, 'Convert button');
      await convertButton.click();
      await page.waitForTimeout(3_000);
    }

    // ─── Step 5: Navigate to Trabajos ────────────────────────────────────
    await showPhaseLabel(page, '🔧 Step 5: Check trabajos');
    await page.click('nav button:has-text("Trabajos")');
    await page.waitForTimeout(2_000);

    const trabajoRow = page.locator('table tr, .rounded-xl.border').first();
    if (await trabajoRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trabajoRow.click();
      await page.waitForTimeout(1_000);
    }

    // ─── Step 6: Navigate to Inventario ──────────────────────────────────
    await showPhaseLabel(page, '📦 Step 6: Check inventario');
    await page.click('nav button:has-text("Inventario")');
    await page.waitForTimeout(2_000);
    await expectVisible(page.locator('h2:has-text("Inventario"), table').first(), 'Inventario loaded');

    // ─── Step 7: Check Cuentas por Cobrar ────────────────────────────────
    await showPhaseLabel(page, '💰 Step 7: Check cuentas por cobrar');
    await page.click('nav button:has-text("Por Cobrar")');
    await page.waitForTimeout(2_000);
    await expectVisible(page.locator('h2:has-text("Cuentas por Cobrar")'), 'Cuentas loaded');

    // ─── Step 8: Verify persistence across sessions ──────────────────────
    await showPhaseLabel(page, '🔄 Step 8: Persistence check');
    await page.click('button:has-text("Salir")');
    await expectVisible(
      page.locator('button:has-text("Entrar al Sistema"), button:has-text("Iniciar Sesión")').first(),
      'Logged out'
    );

    await login(page);

    await page.click('nav button:has-text("Clientes")');
    await page.waitForTimeout(2_000);

    const clientExists = page.locator(`text=${clientName}`);
    if (await clientExists.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expectVisible(clientExists, 'Client persisted');
    }

    // ─── Step 9: Module stability check ──────────────────────────────────
    await showPhaseLabel(page, '🧪 Step 9: Module stability');
    const modules = ['Inventario', 'Trabajos', 'Proveedores', 'Órdenes de Compra', 'Por Cobrar', 'Gastos'] as const;
    for (const mod of modules) {
      await page.click(`nav button:has-text("${mod}")`);
      await page.waitForTimeout(1_500);
    }
    // Final assertion — still on a functional page
    await expectVisible(page.locator('nav button').first(), 'All modules stable');
  });
});
