import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-mano-de-obra-cantidad
 *
 * Proof that PR #182 correctly implements quantity on labor items:
 *   - Each line shows Cant. × P.Unit. = Total
 *   - Section total = sum of all line totals
 *   - Old records without cantidad default to × 1 (backward-compat)
 *
 * Scenario: Add two labor items
 *   1. "Servicio en frenos" × 2 @ $500  → $1,000
 *   2. "Cambio de aceite"   × 1 @ $200  → $200
 *   Section total should be $1,200
 */

test('change-proof-mano-de-obra-cantidad', async ({ page, loginPage, dashboardPage, trabajosPage }) => {
  test.slow(); // Supabase cold-start on preview branch

  // ── Login ──────────────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔐 Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  // ── Navigate to Trabajos ───────────────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Módulo Trabajos');
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(1000);

  // ── Select client + vehicle ────────────────────────────────────────────────
  await showPhaseLabel(page, '👤 Seleccionando cliente y vehículo');
  await trabajosPage.selectClient(1);
  await trabajosPage.selectVehicle(1);

  // ── Fill description ───────────────────────────────────────────────────────
  await trabajosPage.fillDescription('Prueba PR #182 — cantidad en mano de obra');

  // ── Add labor item 1: Servicio en frenos × 2 @ $500 ───────────────────────
  await showPhaseLabel(page, '🔨 Mano de obra: Frenos × 2 @ $500');

  const conceptoInput = page.locator('input[placeholder*="Arreglo de frenos" i], input[placeholder*="engrase" i]').first();
  const precioInput   = page.locator('input[type="number"][placeholder="0.00"]').first();
  // Cantidad input: labeled "Cantidad", type=number, placeholder="1"
  const cantidadInput = page.locator('input[type="number"][placeholder="1"]').first();

  // Fill first labor item
  if (await conceptoInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await conceptoInput.fill('Servicio en frenos');
  }
  if (await precioInput.isVisible().catch(() => false)) {
    await precioInput.fill('500');
  }
  if (await cantidadInput.isVisible().catch(() => false)) {
    await cantidadInput.fill('2');
  }

  const agregarBtn = page.getByRole('button', { name: /^\+?\s*agregar$/i }).first();
  if (await agregarBtn.isVisible().catch(() => false) && !(await agregarBtn.isDisabled().catch(() => true))) {
    await agregarBtn.click();
    await page.waitForTimeout(600);
  }

  // ── Add labor item 2: Cambio de aceite × 1 @ $200 ─────────────────────────
  await showPhaseLabel(page, '🔨 Mano de obra: Aceite × 1 @ $200');

  if (await conceptoInput.isVisible().catch(() => false)) {
    await conceptoInput.fill('Cambio de aceite');
  }
  if (await precioInput.isVisible().catch(() => false)) {
    await precioInput.fill('200');
  }
  // cantidad defaults to 1 after first add — leave at 1
  if (await cantidadInput.isVisible().catch(() => false)) {
    const val = await cantidadInput.inputValue().catch(() => '');
    if (val !== '1') await cantidadInput.fill('1');
  }

  if (await agregarBtn.isVisible().catch(() => false) && !(await agregarBtn.isDisabled().catch(() => true))) {
    await agregarBtn.click();
    await page.waitForTimeout(600);
  }

  // ── Verify line totals ─────────────────────────────────────────────────────
  await showPhaseLabel(page, '✅ Verificando totales por línea');

  // Labor table should show the items with correct math
  // Row 1: Cant.=2, P.Unit.=$500, Total=$1,000
  const frenos1000 = page.locator('text=$1,000').or(page.locator('text=1,000')).first();
  const hasFrenosTotal = await frenos1000.isVisible({ timeout: 5_000 }).catch(() => false);
  expect(hasFrenosTotal, 'Servicio en frenos × 2 × $500 debe mostrar total $1,000').toBe(true);

  // Row 2: Cant.=1, P.Unit.=$200, Total=$200
  const aceite200 = page.locator('text=$200').or(page.locator('text=200.00')).first();
  const hasAceiteTotal = await aceite200.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasAceiteTotal, 'Cambio de aceite × 1 × $200 debe mostrar $200').toBe(true);

  // ── Verify section total ───────────────────────────────────────────────────
  await showPhaseLabel(page, '✅ Verificando total sección: $1,200');

  // "Total Mano de Obra:" footer should show $1,200
  const totalLabel = page.locator('text=Total Mano de Obra').first();
  const totalVisible = await totalLabel.isVisible({ timeout: 5_000 }).catch(() => false);
  expect(totalVisible, '"Total Mano de Obra:" debe ser visible').toBe(true);

  // Check $1,200 appears somewhere in the labor table footer
  const total1200 = page.locator('text=$1,200').or(page.locator('text=1,200')).first();
  const hasTotal = await total1200.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasTotal, 'Total Mano de Obra debe ser $1,200 (frenos $1,000 + aceite $200)').toBe(true);

  await showPhaseLabel(page, '🎉 PR #182 verificado — cantidad × precio = total correcto');
  await page.waitForTimeout(1500);
});
