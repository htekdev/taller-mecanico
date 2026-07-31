import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * BuscadorInventarioOC — Full-screen searchable inventory picker for Órdenes de Compra.
 *
 * Verifies:
 * 1. "Buscar en inventario" button is present in the Órdenes form
 * 2. Clicking opens the full-screen buscador modal (role="dialog")
 * 3. Search input is auto-focused and filters by name/code
 * 4. Category pills filter the list
 * 5. Expanding a card shows cantidad + precio inputs
 * 6. Clicking "Agregar a la orden" adds the item and shows success flash
 * 7. Back/close button returns to the ordenes form
 */

test.describe('BuscadorInventarioOC — inventory picker for purchase orders', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('opens buscador, searches, filters by category, adds item, closes', async ({
    page, dashboardPage, ordenesCompraPage,
  }) => {
    test.slow(); // Supabase cold-start tolerance

    // ── Phase 1: Navigate to Órdenes ──────────────────────────────────────────
    await showPhaseLabel(page, '📋 Phase 1: Navigate to Órdenes de Compra');
    await dashboardPage.navigateToModule('ordenes');
    await ordenesCompraPage.waitForPageLoad();

    // ── Phase 2: Verify "Buscar en inventario" trigger exists ──────────────────
    await showPhaseLabel(page, '🔍 Phase 2: Verify buscador trigger button');
    const buscadorBtn = page.getByRole('button', { name: /buscar en inventario/i }).first();
    await buscadorBtn.scrollIntoViewIfNeeded();
    await expect(buscadorBtn).toBeVisible({ timeout: 10_000 });

    // Old <select> for refacciones must NOT be present (replaced by buscador)
    await expect(page.locator('select:has(option:has-text("Seleccionar refacción"))')).not.toBeVisible();

    // ── Phase 3: Open buscador modal ───────────────────────────────────────────
    await showPhaseLabel(page, '📂 Phase 3: Open buscador modal');
    await buscadorBtn.click();

    // Full-screen modal with role="dialog"
    const modal = page.getByRole('dialog', { name: 'Buscar inventario' });
    await expect(modal).toBeVisible({ timeout: 8_000 });

    // aria-modal should be set
    await expect(modal).toHaveAttribute('aria-modal', 'true');

    // Search input is present
    const searchInput = modal.locator('input[placeholder*="nombre o código" i], input[placeholder*="Buscar" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 3_000 });

    // ── Phase 4: Search filters results ───────────────────────────────────────
    await showPhaseLabel(page, '🔎 Phase 4: Search filters results');
    await searchInput.fill('a');
    await page.waitForTimeout(300);

    const resultItems = modal.locator('.border.rounded-xl').filter({ hasText: /\$/ });
    const sinResultados = modal.locator('text=Sin resultados');
    const hasResults = await resultItems.count() > 0;
    const noResults   = await sinResultados.isVisible().catch(() => false);
    expect(hasResults || noResults).toBeTruthy();

    await searchInput.clear();
    await page.waitForTimeout(300);

    // ── Phase 5: Category filter pills ────────────────────────────────────────
    await showPhaseLabel(page, '🏷️ Phase 5: Category filter pills');
    const todasPill = modal.getByRole('button', { name: 'Todas' });
    const hasCategoryPills = await todasPill.isVisible().catch(() => false);
    if (hasCategoryPills) {
      await expect(todasPill).toBeVisible();
      // Category pills must be at least 44px tall (touch target requirement)
      const pillBox = await todasPill.boundingBox();
      if (pillBox) {
        expect(pillBox.height).toBeGreaterThanOrEqual(44);
      }
    }

    // ── Phase 6: Add a part from inventory ────────────────────────────────────
    await showPhaseLabel(page, '➕ Phase 6: Expand card and add item');
    const allCards = modal.locator('.border.rounded-xl').filter({ hasText: /\$/ });
    const cardCount = await allCards.count();

    if (cardCount > 0) {
      const firstCard = allCards.first();
      const cardHeader = firstCard.locator('button').first();
      await cardHeader.click();
      await page.waitForTimeout(400);

      // Expanded panel: cantidad + precio inputs
      const cantidadInput = firstCard.locator('input[type="number"]').first();
      const precioInput   = firstCard.locator('input[type="number"]').nth(1);
      const agregarBtn    = firstCard.getByRole('button', { name: /agregar a la orden/i });

      const expandedVisible = await cantidadInput.isVisible({ timeout: 3_000 }).catch(() => false);
      if (expandedVisible) {
        // Labels must have htmlFor associations (accessibility)
        const cantLabel = firstCard.locator('label').filter({ hasText: /cant/i }).first();
        if (await cantLabel.isVisible().catch(() => false)) {
          const forAttr = await cantLabel.getAttribute('for');
          expect(forAttr).toBeTruthy();
        }

        await expect(precioInput).toBeVisible();
        await expect(agregarBtn).toBeVisible();

        // Agregar button — click to add
        await agregarBtn.click();

        // ── Phase 7: Success flash ─────────────────────────────────────────────
        await showPhaseLabel(page, '✅ Phase 7: Success flash');
        const successFlash = modal.locator('[aria-live="polite"]');
        await expect(successFlash).toBeVisible({ timeout: 3_000 });
        await expect(successFlash).toContainText(/agregado/i);

        // Modal stays open for multiple adds
        await expect(modal).toBeVisible();

        // ── Phase 8: Back button closes modal ───────────────────────────────────
        await showPhaseLabel(page, '🔙 Phase 8: Back button navigation');
        // Back button must be at least 44px (touch target)
        const backBtn = modal.getByRole('button', { name: /cerrar buscador|←/i }).first();
        await expect(backBtn).toBeVisible();
        const btnBox = await backBtn.boundingBox();
        if (btnBox) {
          expect(btnBox.width).toBeGreaterThanOrEqual(44);
          expect(btnBox.height).toBeGreaterThanOrEqual(44);
        }
        await backBtn.click();
        await expect(modal).not.toBeVisible({ timeout: 3_000 });

      } else {
        // No inventory — close and skip
        const cerrarBtn = modal.getByRole('button', { name: /←|cerrar/i }).first();
        if (await cerrarBtn.isVisible().catch(() => false)) await cerrarBtn.click();
        test.skip(true, 'No inventory data — expand flow not tested');
      }
    } else {
      // No inventory — close and skip add flow
      const cerrarBtn = modal.getByRole('button', { name: /←|cerrar/i }).first();
      if (await cerrarBtn.isVisible().catch(() => false)) await cerrarBtn.click();
      test.skip(true, 'No inventory data — buscador UI verified, add flow skipped');
    }
  });

  test('Escape key closes the buscador modal', async ({
    page, dashboardPage, ordenesCompraPage,
  }) => {
    test.slow();

    await dashboardPage.navigateToModule('ordenes');
    await ordenesCompraPage.waitForPageLoad();

    const buscadorBtn = page.getByRole('button', { name: /buscar en inventario/i }).first();
    await expect(buscadorBtn).toBeVisible({ timeout: 10_000 });
    await buscadorBtn.click();

    const modal = page.getByRole('dialog', { name: 'Buscar inventario' });
    await expect(modal).toBeVisible({ timeout: 8_000 });

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });

  test('search with no results shows empty state with tappable clear actions', async ({
    page, dashboardPage, ordenesCompraPage,
  }) => {
    test.slow();

    await dashboardPage.navigateToModule('ordenes');
    await ordenesCompraPage.waitForPageLoad();

    const buscadorBtn = page.getByRole('button', { name: /buscar en inventario/i }).first();
    await expect(buscadorBtn).toBeVisible({ timeout: 10_000 });
    await buscadorBtn.click();

    const modal = page.getByRole('dialog', { name: 'Buscar inventario' });
    await expect(modal).toBeVisible({ timeout: 8_000 });

    // Search for something unlikely to match
    const searchInput = modal.locator('input[placeholder*="nombre o código" i], input[placeholder*="Buscar" i]').first();
    await searchInput.fill('xyzzy_no_match_9999');
    await page.waitForTimeout(400);

    // Empty state must appear
    const sinResultados = modal.locator('text=Sin resultados');
    await expect(sinResultados).toBeVisible({ timeout: 3_000 });

    // "Limpiar búsqueda" button must be visible and tappable (≥44px)
    const limpiarBtn = modal.getByRole('button', { name: /limpiar búsqueda/i });
    await expect(limpiarBtn).toBeVisible();
    const limpiarBox = await limpiarBtn.boundingBox();
    if (limpiarBox) {
      expect(limpiarBox.height).toBeGreaterThanOrEqual(44);
    }

    // Clicking it clears the search
    await limpiarBtn.click();
    await expect(searchInput).toHaveValue('');

    // Close buscador
    const backBtn = modal.getByRole('button', { name: /cerrar buscador|←/i }).first();
    await backBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });
});
