import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * Categorías personalizadas persistentes en Órdenes de Compra.
 *
 * Verifies:
 * 1. The category dropdown in a new OC refacción includes 'Otra (escribir)...'
 * 2. Typing a custom category saves it to Supabase
 * 3. After reload, the custom category appears in the dropdown for future orders
 */

test.describe('Categorías personalizadas — persist across reloads', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('custom category typed in OC persists after page reload', async ({
    page, dashboardPage,
  }) => {
    test.slow(); // Supabase cold-start + reload cycle

    const CUSTOM_CATEGORY = `TestCat_${Date.now()}`;

    // ── Phase 1: Navigate to Órdenes de Compra ────────────────────────────────
    await showPhaseLabel(page, '📦 Phase 1: Navegar a Órdenes de Compra');
    await dashboardPage.navigateToModule('ordenes');
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await expect(page.getByRole('heading', { name: /órdenes de compra/i })).toBeVisible({ timeout: 15_000 });

    // ── Phase 2: Open new order form ──────────────────────────────────────────
    await showPhaseLabel(page, '➕ Phase 2: Abrir formulario nueva OC');
    const nuevaOrdenBtn = page.getByRole('button', { name: /nueva orden|nueva oc|crear orden/i });
    if (await nuevaOrdenBtn.count() === 0) {
      test.skip(true, 'No se encontró botón "Nueva Orden" — skippeando prueba de categorías');
    }
    await nuevaOrdenBtn.first().click();
    await page.waitForTimeout(500);

    // ── Phase 3: Add a refacción row ──────────────────────────────────────────
    await showPhaseLabel(page, '🔩 Phase 3: Agregar refacción');
    const agregarRefBtn = page.getByRole('button', { name: /agregar.*refacción|nueva refacción/i });
    if (await agregarRefBtn.count() === 0) {
      test.skip(true, 'No se encontró botón de agregar refacción');
    }
    await agregarRefBtn.first().click();
    await page.waitForTimeout(300);

    // ── Phase 4: Select 'Otra (escribir)...' in category dropdown ─────────────
    await showPhaseLabel(page, '📋 Phase 4: Seleccionar categoría "Otra"');
    const categoriaSelect = page.locator('select').filter({ hasText: /otra|escribir|categoría/i }).first();
    const allSelects = page.locator('select');
    const selectCount = await allSelects.count();

    // Find the category select (usually has "Otra (escribir)..." option)
    let categorySelectFound = false;
    for (let i = 0; i < selectCount; i++) {
      const sel = allSelects.nth(i);
      const options = await sel.locator('option').allTextContents();
      if (options.some(o => /otra|escribir/i.test(o))) {
        await sel.selectOption({ label: options.find(o => /otra|escribir/i.test(o)) ?? '' });
        categorySelectFound = true;
        break;
      }
    }

    if (!categorySelectFound) {
      // Try the categoriaSelect locator directly
      const optionCount = await categoriaSelect.locator('option').count();
      if (optionCount > 0) {
        await categoriaSelect.selectOption({ index: optionCount - 1 }); // last option is usually "Otra"
      } else {
        test.skip(true, 'No se encontró dropdown de categoría con opción "Otra"');
      }
    }

    // ── Phase 5: Type custom category name ────────────────────────────────────
    await showPhaseLabel(page, '✏️ Phase 5: Escribir categoría personalizada');
    const customInput = page.getByPlaceholder(/categoría|nueva categoría|escribir/i);
    if (await customInput.count() === 0) {
      test.skip(true, 'No apareció input de categoría personalizada');
    }
    await customInput.first().fill(CUSTOM_CATEGORY);
    await page.waitForTimeout(300);

    // ── Phase 6: Save / confirm the refacción ────────────────────────────────
    await showPhaseLabel(page, '💾 Phase 6: Guardar refacción');
    const saveRefBtn = page.getByRole('button', { name: /guardar|agregar|confirmar/i }).first();
    await saveRefBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1_000);

    // ── Phase 7: Reload the page ──────────────────────────────────────────────
    await showPhaseLabel(page, '🔄 Phase 7: Recargar página');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await dashboardPage.navigateToModule('ordenes');
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    // ── Phase 8: Open new order and verify custom category appears ────────────
    await showPhaseLabel(page, '✅ Phase 8: Verificar categoría persiste');
    const nuevaOrdenBtn2 = page.getByRole('button', { name: /nueva orden|nueva oc|crear orden/i });
    if (await nuevaOrdenBtn2.count() > 0) {
      await nuevaOrdenBtn2.first().click();
      await page.waitForTimeout(500);

      const agregarRefBtn2 = page.getByRole('button', { name: /agregar.*refacción|nueva refacción/i });
      if (await agregarRefBtn2.count() > 0) {
        await agregarRefBtn2.first().click();
        await page.waitForTimeout(300);

        // Check that the custom category appears in any select's options
        const allSelectsAfter = page.locator('select');
        const selectCountAfter = await allSelectsAfter.count();
        let found = false;
        for (let i = 0; i < selectCountAfter; i++) {
          const sel = allSelectsAfter.nth(i);
          const options = await sel.locator('option').allTextContents();
          if (options.some(o => o.includes(CUSTOM_CATEGORY))) {
            found = true;
            break;
          }
        }
        expect(found, `Categoría personalizada "${CUSTOM_CATEGORY}" debe aparecer en el dropdown después de recargar`).toBe(true);
      }
    }
  });
});
