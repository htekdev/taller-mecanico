import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-inventario-eliminar-proveedor — Video proof for PR #108
 *
 * Demonstrates the two Sofia-requested features:
 *
 * 1. ✅ "🗑 Eliminar" button on each inventory row
 *    - 2-step confirmation: first click shows "✓ Confirmar / Cancelar"
 *    - Cancel path: confirm buttons disappear, part remains
 *    - Confirm path: part is removed from the list
 *
 * 2. ✅ Inline "Nuevo proveedor" form in Inventario tab
 *    - Click "+ Nuevo proveedor" → form appears
 *    - Fill nombre + teléfono → click "Guardar proveedor"
 *    - New proveedor appears in the proveedor select dropdown
 */

const UNIQUE_PART  = `PIEZA-VIDEO-${Date.now()}`;
const UNIQUE_PROV  = `PROV-VIDEO-${Date.now()}`;

test('change-proof-inventario-eliminar-proveedor', { retries: 1 }, async ({ page, loginPage, dashboardPage, inventarioPage }) => {
  test.slow();

  // ── 1. Login ────────────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔐 Login al Taller Mecánico');
  await loginPage.loginAsTestUser();
  await page.locator('nav').waitFor({ state: 'visible', timeout: 90_000 });
  await page.waitForTimeout(1000);

  // ── 2. Navigate to Inventario ────────────────────────────────────────────────
  await showPhaseLabel(page, '📦 Módulo Inventario');
  await dashboardPage.navigateToModule('inventario');
  await inventarioPage.waitForPageLoad();
  await page.waitForTimeout(1000);

  // ── 3. Add a test part ───────────────────────────────────────────────────────
  await showPhaseLabel(page, '➕ Agregando pieza de prueba: ' + UNIQUE_PART);
  await inventarioPage.addPart({ nombre: UNIQUE_PART, stock: 5 });
  await page.waitForTimeout(2000);

  const partAdded = await inventarioPage.isPartVisible(UNIQUE_PART);
  expect(partAdded, `La pieza "${UNIQUE_PART}" debe aparecer en la lista`).toBe(true);
  await showPhaseLabel(page, '✅ Pieza agregada correctamente');
  await page.waitForTimeout(800);

  // ── 4. Show 2-step delete — CANCEL path ─────────────────────────────────────
  await showPhaseLabel(page, '🗑 Eliminación 2 pasos — probando CANCELAR');
  await inventarioPage.eliminarPieza(UNIQUE_PART, /* confirm= */ false);
  await page.waitForTimeout(500);

  // After cancel, the part must still be visible
  const stillVisibleAfterCancel = await inventarioPage.isPartVisible(UNIQUE_PART);
  expect(stillVisibleAfterCancel, 'Cancelar NO debe eliminar la pieza').toBe(true);
  await showPhaseLabel(page, '✅ Cancelar funciona — pieza todavía existe');
  await page.waitForTimeout(1000);

  // ── 5. Delete with CONFIRM ───────────────────────────────────────────────────
  await showPhaseLabel(page, '🗑 Eliminación 2 pasos — confirmando eliminación');
  await inventarioPage.eliminarPieza(UNIQUE_PART, /* confirm= */ true);
  await page.waitForTimeout(2000);

  // Part must now be gone
  const goneAfterConfirm = await inventarioPage.isPartVisible(UNIQUE_PART);
  expect(goneAfterConfirm, `Confirmar SÍ debe eliminar la pieza "${UNIQUE_PART}"`).toBe(false);
  await showPhaseLabel(page, '✅ Pieza eliminada tras confirmación');
  await page.waitForTimeout(800);

  // ── 6. Scroll back to top ────────────────────────────────────────────────────
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // ── 6b. Add a filler part so inventory is non-empty (filtroProveedorSelect only renders when inventario.length > 0) ──
  await inventarioPage.addPart({ nombre: UNIQUE_PART + '-B', stock: 1 });
  await page.waitForTimeout(1500);

  // ── 7. Add a new proveedor inline ────────────────────────────────────────────
  await showPhaseLabel(page, '🏪 Agregando proveedor inline: ' + UNIQUE_PROV);
  await inventarioPage.agregarProveedorInline(UNIQUE_PROV, '555-1234');
  await page.waitForTimeout(2000);

  // New proveedor should appear in the filter proveedor select (always visible — confirms it's in the system)
  await showPhaseLabel(page, '✅ Verificando proveedor en selector de filtro...');
  const filtroSelect = inventarioPage.filtroProveedorSelect;
  await filtroSelect.waitFor({ state: 'visible', timeout: 10_000 });
  const filtroOptions = await filtroSelect.locator('option').allTextContents().catch(() => [] as string[]);
  const provFound = filtroOptions.some(opt => opt.includes(UNIQUE_PROV) || opt.toLowerCase().includes(UNIQUE_PROV.toLowerCase()));
  expect(provFound, `El proveedor "${UNIQUE_PROV}" debe aparecer en el selector`).toBe(true);

  await showPhaseLabel(page, `✅ Proveedor "${UNIQUE_PROV}" disponible en selector`);
  await page.waitForTimeout(800);

  // ── 8. Final summary ─────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🎉 PR #108 verificado — Eliminar ✅ · Proveedor inline ✅');
  await page.waitForTimeout(2000);
});
