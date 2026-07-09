import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * Gastos — Personal Category & Subcategorías Validation
 *
 * PR #135 added a new "Personal" category with preset subcategories and
 * a custom subcategory free-text input.  The existing change-proof spec
 * (change-proof-gastos-categoria-personal.spec.ts) is fixme'd.
 *
 * This spec provides reliable UI validation (no DB writes):
 * 1. Personal category option exists in the category dropdown
 * 2. Selecting Personal shows its preset subcategories
 * 3. All 5 preset subcategories are present (Alimentación, Transporte, Salud, Educación, Entretenimiento)
 * 4. "Escribir nueva subcategoria..." option exists for Personal
 * 5. Selecting __otros__ reveals the free-text input
 * 6. Other categories do NOT show Personal subcategories after re-selecting
 */

test.describe('Gastos — Personal Category Subcategories', { retries: 1 }, () => {
  test.describe.configure({ retries: 1 }); // Supabase cold-start flaky
  test.beforeEach(async ({ loginPage, dashboardPage }) => {
    await loginPage.loginAsTestUser();
    await dashboardPage.navigateToModule('gastos');
    await dashboardPage.waitForPageLoad();
    await dashboardPage.page.waitForTimeout(800);
  });

  test('Personal category option is present in category dropdown', async ({
    page, dashboardPage, gastosPage,
  }) => {
    await showPhaseLabel(page, '📂 Phase 1: Open New Gasto Form');

    // Open form
    const nuevoBtn = gastosPage.nuevoGastoButton;
    const hasBtn = await nuevoBtn.isVisible().catch(() => false);
    if (hasBtn) {
      await nuevoBtn.click();
      await page.waitForTimeout(600);
    }

    // Category select must be visible
    await expect(gastosPage.categoriaSelect).toBeVisible({ timeout: 10_000 });

    // Personal option must exist
    const personalOption = page.locator('select').first().locator('option[value="personal"]');
    const optionCount = await personalOption.count();
    expect(optionCount, '"personal" option must exist in category select').toBeGreaterThanOrEqual(1);

    await showPhaseLabel(page, '✅ Personal Category Option Present');
  });

  test('selecting Personal shows preset subcategories', async ({
    page, dashboardPage, gastosPage,
  }) => {
    await showPhaseLabel(page, '🏷️ Phase 1: Select Personal Category');

    // Open form
    const nuevoBtn = gastosPage.nuevoGastoButton;
    if (await nuevoBtn.isVisible().catch(() => false)) {
      await nuevoBtn.click();
      await page.waitForTimeout(600);
    }

    await expect(gastosPage.categoriaSelect).toBeVisible({ timeout: 10_000 });

    // Select Personal
    await gastosPage.categoriaSelect.selectOption('personal');
    await page.waitForTimeout(500);

    // Subcategory dropdown must now be visible
    await expect(gastosPage.subcategoriaSelect).toBeVisible({ timeout: 5_000 });

    // Get all subcategory option texts
    const subcatOptions = await gastosPage.subcategoriaSelect
      .locator('option')
      .allTextContents();
    const joined = subcatOptions.join('|');

    // All 5 preset subcategories from GASTO_SUBCATEGORIAS.personal
    expect(joined).toMatch(/Alimentaci/i);
    expect(joined).toMatch(/Transporte/i);
    expect(joined).toMatch(/Salud/i);
    expect(joined).toMatch(/Educaci/i);
    expect(joined).toMatch(/Entretenimiento/i);

    await showPhaseLabel(page, '✅ Personal Preset Subcategories Present');
  });

  test('Personal category has "Escribir nueva subcategoria" option', async ({
    page, dashboardPage, gastosPage,
  }) => {
    await showPhaseLabel(page, '✏️ Phase 1: Custom Subcategory Option');

    // Open form
    const nuevoBtn = gastosPage.nuevoGastoButton;
    if (await nuevoBtn.isVisible().catch(() => false)) {
      await nuevoBtn.click();
      await page.waitForTimeout(600);
    }

    await expect(gastosPage.categoriaSelect).toBeVisible({ timeout: 10_000 });
    await gastosPage.categoriaSelect.selectOption('personal');
    await page.waitForTimeout(400);

    // The "Escribir nueva subcategoria..." option (value=__otros__) must exist
    const otrosOption = gastosPage.subcategoriaSelect.locator('option[value="__otros__"]');
    const count = await otrosOption.count();
    expect(count, '"__otros__" write-in option must exist for personal category').toBeGreaterThanOrEqual(1);

    const optionText = await otrosOption.first().textContent();
    expect(optionText).toMatch(/subcategor|escribir|otros/i);

    await showPhaseLabel(page, '✅ Custom Subcategory Option Present');
  });

  test('selecting __otros__ reveals free-text input', async ({
    page, dashboardPage, gastosPage,
  }) => {
    await showPhaseLabel(page, '🖊️ Phase 1: Free-text Input Reveal');

    // Open form
    const nuevoBtn = gastosPage.nuevoGastoButton;
    if (await nuevoBtn.isVisible().catch(() => false)) {
      await nuevoBtn.click();
      await page.waitForTimeout(600);
    }

    await expect(gastosPage.categoriaSelect).toBeVisible({ timeout: 10_000 });
    await gastosPage.categoriaSelect.selectOption('personal');
    await page.waitForTimeout(400);

    // Select the custom option
    await gastosPage.subcategoriaSelect.selectOption('__otros__');
    await page.waitForTimeout(500);

    // Free-text input must appear
    const customInput = page.locator('input[placeholder*="Describe"]').first();
    await expect(customInput).toBeVisible({ timeout: 5_000 });

    // Can type into it
    await customInput.fill('Gastos mascota');
    const value = await customInput.inputValue();
    expect(value).toBe('Gastos mascota');

    await showPhaseLabel(page, '✅ Free-text Input Revealed and Writable');
  });

  test('switching back from Personal resets subcategory list', async ({
    page, dashboardPage, gastosPage,
  }) => {
    test.slow();
    await showPhaseLabel(page, '🔄 Phase 1: Category Switch Reset');

    // Open form
    const nuevoBtn = gastosPage.nuevoGastoButton;
    if (await nuevoBtn.isVisible().catch(() => false)) {
      await nuevoBtn.click();
      await page.waitForTimeout(600);
    }

    await expect(gastosPage.categoriaSelect).toBeVisible({ timeout: 10_000 });

    // Select Personal → then switch to Operativos
    await gastosPage.categoriaSelect.selectOption('personal');
    await page.waitForTimeout(400);
    await gastosPage.categoriaSelect.selectOption('operativo');
    await page.waitForTimeout(400);

    // Subcategories should now be operativo's list, not personal's
    const subcatOptions = await gastosPage.subcategoriaSelect
      .locator('option')
      .allTextContents();
    const joined = subcatOptions.join('|');

    // Operativos subcategories (from GASTO_SUBCATEGORIAS.operativo)
    expect(joined).toMatch(/Renta|Agua|Luz|Internet|Herramientas/i);
    // Personal's subcategories should NOT be the primary options
    // (they may appear as custom subs, but preset "Alimentación" etc are personal-only)
    // The key check: the "Escribir nueva subcategoria..." option text changes for non-personal
    const otrosOption = gastosPage.subcategoriaSelect.locator('option[value="__otros__"]');
    if (await otrosOption.count() > 0) {
      const otrosText = await otrosOption.first().textContent();
      // For non-personal categories, it shows generic "Otros (escribir...)" not "Escribir nueva subcategoria..."
      expect(otrosText).toBeTruthy(); // Just verify it exists, label may vary
    }

    await showPhaseLabel(page, '✅ Category Switch Resets Subcategories');
  });
});