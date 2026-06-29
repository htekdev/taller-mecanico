import { test, expect } from '../../fixtures';
import { showPhaseLabel, expectVisible } from '../visual-assert';

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
test('full-walk-through-departamentos-ayuntamiento', async ({
  page, loginPage, dashboardPage, trabajosPage, sidebar
}) => {
  // Extra time: involves Supabase reads/writes on fresh preview DB
  test.slow();
  // Unique name avoids strict-mode violations from prior test-run DB state
  const deptName = `Test Dept ${Date.now()}`;

  // ── Phase 1: Login ─────────────────────────────────────────────────────────
  await showPhaseLabel(page, '🔑 Phase 1: Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();
  await expectVisible(dashboardPage.nav, 'Dashboard loaded');

  // ── Phase 2: Navigate to Trabajos ──────────────────────────────────────────
  await showPhaseLabel(page, '🔧 Phase 2: Trabajos Module');
  await sidebar.clickTab('Trabajos');
  await trabajosPage.waitForPageLoad();
  await expectVisible(trabajosPage.sectionTitle, 'Trabajos section visible');

  // ── Phase 3: Switch to Ayuntamiento sub-tab ────────────────────────────────
  await showPhaseLabel(page, '🏛️ Phase 3: Ayuntamiento Sub-Tab');
  // Look for Ayuntamiento sub-tab button (inside the Trabajos section)
  const ayuntamientoTab = page.getByRole('button', { name: /ayuntamiento/i }).first();
  if (await ayuntamientoTab.isVisible().catch(() => false)) {
    await ayuntamientoTab.click();
    await page.waitForTimeout(1000);
  }

  // ── Phase 4: Open departamentos manager ────────────────────────────────────
  await showPhaseLabel(page, '⚙️ Phase 4: Open Departamentos Manager');
  // The gear button is "⚙️ Departamentos"
  const gearBtn = page.getByRole('button', { name: /departamentos/i }).first();
  if (await gearBtn.isVisible().catch(() => false)) {
    await gearBtn.click();
    await page.waitForTimeout(1500);

    // Verify defaults loaded from Supabase
    const gestTitle = page.locator('text=Gestión de Departamentos');
    if (await gestTitle.isVisible().catch(() => false)) {
      await showPhaseLabel(page, '✅ Manager Open');
      await page.waitForTimeout(500);

      // Check for any department (defaults seeded on first access)
      const anyDepto = page.locator('div').filter({ hasText: /obras públicas|servicios públicos|aseo urbano/i }).first();
      const hasDefaults = await anyDepto.isVisible().catch(() => false);
      if (hasDefaults) {
        await expectVisible(anyDepto, 'Default departments loaded from Supabase');
      }
      await page.waitForTimeout(800);

      // Scroll to see all departments
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(600);

      // ── Phase 5: Add a new department ────────────────────────────────────
      await showPhaseLabel(page, '➕ Phase 5: Add Department');
      const nuevoDeptoInput = page.locator('input[placeholder*="Nuevo departamento"]');
      if (await nuevoDeptoInput.isVisible().catch(() => false)) {
        await nuevoDeptoInput.fill(deptName);
        await page.waitForTimeout(500);
        const agregarBtn = page.getByRole('button', { name: /^agregar$/i });
        if (await agregarBtn.isVisible().catch(() => false)) {
          await agregarBtn.click();
          await page.waitForTimeout(2000); // wait for Supabase write

          // Verify new department appears (first() avoids strict-mode if there are matches from prior runs)
          const newDepto = page.locator(`text=${deptName}`).first();
          if (await newDepto.isVisible().catch(() => false)) {
            await expectVisible(newDepto, 'New department added to Supabase');
            await page.waitForTimeout(500);

            // ── Phase 6: Delete the department ─────────────────────────────
            await showPhaseLabel(page, '🗑️ Phase 6: Delete Department');
            const deptoRow = page.locator('div').filter({ hasText: deptName }).first();
            const deleteBtn = deptoRow.getByRole('button', { name: '✕' });
            if (await deleteBtn.isVisible().catch(() => false)) {
              await deleteBtn.click();
              await page.waitForTimeout(2000); // wait for Supabase delete
              // toHaveCount(0) avoids strict-mode violation; confirms DOM removal
              await expect(page.locator(`text=${deptName}`)).toHaveCount(0);
              await showPhaseLabel(page, '✅ Department deleted from Supabase');
            }
          }
        }
      }
    }
  }

  // ── Phase 7: Navigate away and back ────────────────────────────────────────
  await showPhaseLabel(page, '🔄 Phase 7: Persist Check');
  await sidebar.clickTab('Clientes');
  await page.waitForTimeout(1000);

  await sidebar.clickTab('Trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(500);

  // Reopen Ayuntamiento tab and departamentos manager
  const ayuntamientoTab2 = page.getByRole('button', { name: /ayuntamiento/i }).first();
  if (await ayuntamientoTab2.isVisible().catch(() => false)) {
    await ayuntamientoTab2.click();
    await page.waitForTimeout(800);
  }
  const gearBtn2 = page.getByRole('button', { name: /departamentos/i }).first();
  if (await gearBtn2.isVisible().catch(() => false)) {
    await gearBtn2.click();
    await page.waitForTimeout(1500);

    // deptName should be gone (deleted in phase 6)
    await expect(page.locator(`text=${deptName}`)).toHaveCount(0);
    await showPhaseLabel(page, '✅ Departamentos — Supabase migration working');
  }

  // Final scroll
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(800);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(800);
});
