import { test, expect } from '../../fixtures' ;
import { showPhaseLabel } from '../visual-a ssert';

/**
 * change-proof-inventario-elimi nar-proveedor — Video proof for PR #108
 *
  * Demonstrates the two Sofia-requested featu res:
 *
 * 1. ✅ "🗑 Eliminar" button on e ach inventory row
 *    - 2-step confirmation : first click shows "✓ Confirmar / Cancelar "
 *    - Cancel path: confirm buttons disapp ear, part remains
 *    - Confirm path: part  is removed from the list
 *
 * 2. ✅ Inline  "Nuevo proveedor" form in Inventario tab
 *     - Click "+ Nuevo proveedor" → form appear s
 *    - Fill nombre + teléfono → click " Guardar proveedor"
 *    - New proveedor appe ars in the proveedor select dropdown
 */

con st UNIQUE_PART  = `PIEZA-VIDEO-${Date.now()}` ;
const UNIQUE_PROV  = `PROV-VIDEO-${Date.now ()}`;

test('change-proof-inventario-eliminar -proveedor', async ({ page, loginPage, dashbo ardPage, inventarioPage }) => {
  test.slow() ;

  // ── 1. Login ─────── ─────────────── ─────────────── ─────────────── ────────────
  await  showPhaseLabel(page, '🔐 Login al Taller Me cánico');
  await loginPage.loginAsTestUser( );
  await page.locator('nav').waitFor({ stat e: 'visible', timeout: 45_000 });
  await pag e.waitForTimeout(1000);

  // ── 2. Navig ate to Inventario ───────── ─────────────── ─────────────── ─────────
  await showPhase Label(page, '📦 Módulo Inventario');
  awa it dashboardPage.navigateToModule('inventario ');
  await inventarioPage.waitForPageLoad(); 
  await page.waitForTimeout(1000);

  // ─ ─ 3. Add a test part ───────� ��──────────────� ��──────────────� ��──────────────� ��──
  await showPhaseLabel(page, '➕ Ag regando pieza de prueba: ' + UNIQUE_PART);
   await inventarioPage.addPart({ nombre: UNIQUE _PART, stock: 5 });
  await page.waitForTimeo ut(2000);

  const partAdded = await inventar ioPage.isPartVisible(UNIQUE_PART);
  expect(p artAdded, `La pieza "${UNIQUE_PART}" debe apa recer en la lista`).toBe(true);
  await showP haseLabel(page, '✅ Pieza agregada correctam ente');
  await page.waitForTimeout(800);

   // ── 4. Show 2-step delete — CANCEL pa th ────────────── ─────────────── ────────
  await showPhaseLab el(page, '🗑 Eliminación 2 pasos — proba ndo CANCELAR');
  await inventarioPage.elimin arPieza(UNIQUE_PART, /* confirm= */ false);
   await page.waitForTimeout(500);

  // After  cancel, the part must still be visible
  cons t stillVisibleAfterCancel = await inventarioP age.isPartVisible(UNIQUE_PART);
  expect(stil lVisibleAfterCancel, 'Cancelar NO debe elimin ar la pieza').toBe(true);
  await showPhaseLa bel(page, '✅ Cancelar funciona — pieza to davía existe');
  await page.waitForTimeout( 1000);

  // ── 5. Delete with CONFIRM � �──────────────� �──────────────� �──────────────� �─────
  await showPhaseLabel(page,  '🗑 Eliminación 2 pasos — confirmando e liminación');
  await inventarioPage.elimina rPieza(UNIQUE_PART, /* confirm= */ true);
  a wait page.waitForTimeout(2000);

  // Part mu st now be gone
  const goneAfterConfirm = awa it inventarioPage.isPartVisible(UNIQUE_PART); 
  expect(goneAfterConfirm, `Confirmar SÍ de be eliminar la pieza "${UNIQUE_PART}"`).toBe( false);
  await showPhaseLabel(page, '✅ Pie za eliminada tras confirmación');
  await pa ge.waitForTimeout(800);

  // ── 6. Scrol l back to top ──────────� ��──────────────� ��──────────────� ��───────────
  await p age.evaluate(() => window.scrollTo(0, 0));
   await page.waitForTimeout(500);

  // ──  7. Add a new proveedor inline ───── ─────────────── ─────────────── ─────────
  await showPhase Label(page, '🏪 Agregando proveedor inline:  ' + UNIQUE_PROV);
  await inventarioPage.agr egarProveedorInline(UNIQUE_PROV, '555-1234'); 
  await page.waitForTimeout(2000);

  // New  proveedor should appear in the proveedor sel ect
  await showPhaseLabel(page, '✅ Verific ando proveedor en selector...');
  const prov Select = inventarioPage.proveedorSelect;
  co nst provOptions = await provSelect.locator('o ption').allTextContents().catch(() => [] as s tring[]);
  const provFound = provOptions.som e(opt => opt.includes(UNIQUE_PROV) || opt.toL owerCase().includes(UNIQUE_PROV.toLowerCase() ));
  expect(provFound, `El proveedor "${UNIQ UE_PROV}" debe aparecer en el selector`).toBe (true);

  await showPhaseLabel(page, `✅ Pr oveedor "${UNIQUE_PROV}" disponible en select or`);
  await page.waitForTimeout(800);

  //  ── 8. Final summary ──────� �──────────────� �──────────────� �──────────────� �─────
  await showPhaseLabel(page,  '🎉 PR #108 verificado — Eliminar ✅ ·  Proveedor inline ✅');
  await page.waitFor Timeout(2000);
});
 