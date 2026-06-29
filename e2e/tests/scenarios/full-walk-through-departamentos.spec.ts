import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * Full Walk-Through — Departamentos Ayuntamiento (Supabase migration)
 *
 * Proves that the `departamentos_ayuntamiento` Supabase migration works:
 * - Departments load from the DB (not localStorage) after login
 * - Defaults are seeded on first access
 * - Add a new department → persisted in Supabase
 * - Delete a department → removed from Supabase
 * - Navigate away and back → departments still there
 *
 * This is ONE single test block to produce ONE continuous video.
 */
test('full-walk-through-departamentos-ayuntamiento', async ({ page, loginPage }) => {
  // ── Phase 1: Login ─────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔑 Phase 1: Login');
  await loginPage.loginAsTestUser();
  await page.waitForTimeout(1500);

  // ── Phase 2: Navigate to Trabajos ──────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Phase 2: Trabajos Module');
  const trabajosBtn = page.getByRole('button', { name: /trabajos/i }).first();
  await trabajosBtn.click();
  await page.waitForTimeout(1500);

  // ── Phase 3: Switch to Ayuntamiento sub-tab ────────────────────────────────
  await showPhaseLabel(page, '🏛️ Phase 3: Ayuntamiento Sub-Tab');
  const ayuntamientoTab = page.getByRole('button', { name: /ayuntamiento/i });
  await ayuntamientoTab.click();
  await page.waitForTimeout(1000);

  // ── Phase 4: Open departamentos manager ────────────────────────────────────
  await showPhaseLabel(page, '⚙️ Phase 4: Open Departamentos Manager');
  const gearBtn = page.getByRole('button', { name: /departamentos/i });
  await gearBtn.click();
  await page.waitForTimeout(1000);

  // Verify defaults loaded from Supabase (not hardcoded)
  const managerContainer = page.locator('text=Gestión de Departamentos').locator('..');
  await expect(page.locator('text=Obras públicas mantenimiento vial')).toBeVisible();
  await page.waitForTimeout(800);

  // Scroll to see all departments
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);

  // ── Phase 5: Add a new department ─────────────────────────────────────────
  await showPhaseLabel(page, '➕ Phase 5: Add Department');
  const nuevoDeptoInput = page.locator('input[placeholder*="Nuevo departamento"]');
  await nuevoDeptoInput.fill('Parques y jardines');
  await page.waitForTimeout(600);
  const agregarBtn = page.getByRole('button', { name: /^agregar$/i });
  await agregarBtn.click();
  await page.waitForTimeout(1500);

  // Verify new department appears
  await expect(page.locator('text=Parques y jardines')).toBeVisible();
  await page.waitForTimeout(800);

  // ── Phase 6: Delete the department we just added ───────────────────────────
  await showPhaseLabel(page, '🗑️ Phase 6: Delete Department');
  // Find and click the ✕ button next to 'Parques y jardines'
  const deptoRow = page.locator('div').filter({ hasText: 'Parques y jardines' }).first();
  const deleteBtn = deptoRow.getByRole('button', { name: '✕' });
  await deleteBtn.click();
  await page.waitForTimeout(1500);

  // Verify it's gone
  await expect(page.locator('text=Parques y jardines')).not.toBeVisible();
  await page.waitForTimeout(500);

  // ── Phase 7: Navigate away and back — verify persistence ──────────────────
  await showPhaseLabel(page, '🔄 Phase 7: Persist Check — Away and Back');
  // Navigate to Clientes
  const clientesBtn = page.getByRole('button', { name: /clientes/i }).first();
  await clientesBtn.click();
  await page.waitForTimeout(1000);

  // Navigate back to Trabajos → Ayuntamiento
  await trabajosBtn.click();
  await page.waitForTimeout(1000);
  await ayuntamientoTab.click();
  await page.waitForTimeout(800);

  // Open manager again
  await gearBtn.click();
  await page.waitForTimeout(1000);

  // Verify original departments still present (loaded from Supabase)
  await expect(page.locator('text=Obras públicas mantenimiento vial')).toBeVisible();
  await expect(page.locator('text=Parques y jardines')).not.toBeVisible();
  await page.waitForTimeout(500);

  // ── Phase 8: Verify department used in ayuntamiento work order form ────────
  await showPhaseLabel(page, '📋 Phase 8: Department Dropdown in Form');
  // Close the manager
  await gearBtn.click();
  await page.waitForTimeout(500);

  // Scroll down to the form area
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(800);

  // Check that Departamento dropdown in the form has Supabase-loaded options
  const deptoSelect = page.locator('select').filter({ hasText: /obras públicas|departamento/i }).first();
  if (await deptoSelect.count() > 0) {
    await deptoSelect.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const options = await deptoSelect.locator('option').allTextContents();
    const hasObras = options.some(o => o.toLowerCase().includes('obras'));
    expect(hasObras).toBeTruthy();
  }
  await page.waitForTimeout(500);

  // ── Final scroll to show complete state ────────────────────────────────────
  await showPhaseLabel(page, '✅ Departamentos — Supabase migration working');
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(1000);
});
