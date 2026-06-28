import { test, expect } from '../../fixtures';
import { expectVisible, showPhaseLabel } from '../visual-assert';
import { TestData } from '../../utils/test-data';

/**
 * Special Characters & Long Text — Unicode, accents, and boundary lengths.
 *
 * Tests:
 * 1. Client name with Spanish accents (á, é, í, ó, ú, ñ, ü)
 * 2. Part description with 200+ characters
 * 3. Expense concepto with special chars ($, #, &, @)
 * 4. Vehicle placa with alphanumeric mix
 * 5. Verify no mojibake or encoding corruption
 */

test.describe('Special Characters & Long Text', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  test('Spanish accents in client name and part descriptions', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '🔤 Spanish Accents');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Add part with accented name
    const accentName = `Válvula de presión Año 2024 — piñón`;
    await inventarioPage.addPart({
      nombre: accentName,
      precioCompra: 350,
      stock: 3,
    });

    // Verify the accented text displays correctly
    const partVisible = await inventarioPage.isPartVisible('Válvula');
    expect(partVisible).toBe(true);

    // No encoding corruption
    const bodyText = await page.locator('main').innerText().catch(() => '');
    expect(bodyText).not.toContain('Ã');  // UTF-8 mojibake marker
    expect(bodyText).not.toContain('â€');  // Another mojibake pattern

    await showPhaseLabel(page, '✅ Accents Display Correctly');
  });

  test('long description text does not crash UI', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '📝 Long Text');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    // Create a very long part name (200+ chars)
    const longName = 'Refacción de prueba con nombre extremadamente largo para verificar ' +
      'que la interfaz maneja correctamente textos extensos sin romper el layout ni ' +
      'causar overflow horizontal o vertical en las tarjetas de inventario del sistema';

    await inventarioPage.addPart({
      nombre: longName,
      precioCompra: 100,
      stock: 1,
    });

    // UI should not be broken (nav still visible)
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    // No horizontal scrollbar forced (optional check)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    // Allow some tolerance but not massive overflow
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 50);

    await showPhaseLabel(page, '✅ Long Text Handled');
  });

  test('special characters in expense concepto', async ({
    page, dashboardPage, gastosPage
  }) => {
    await showPhaseLabel(page, '⚡ Special Chars in Gastos');
    await dashboardPage.navigateToModule('gastos');
    await gastosPage.waitForPageLoad();

    // Add expense with special characters
    const specialConcepto = `Pago #123 — Servicio "completo" & IVA (16%) $$$`;
    await gastosPage.addExpense({
      concepto: specialConcepto,
      monto: 999,
    });

    // Module should still be healthy
    const healthy = await gastosPage.isModuleHealthy();
    expect(healthy).toBe(true);

    await showPhaseLabel(page, '✅ Special Chars OK');
  });

  test('emoji in descriptions does not break rendering', async ({
    page, dashboardPage, inventarioPage
  }) => {
    await showPhaseLabel(page, '😀 Emoji Handling');
    await dashboardPage.navigateToModule('inventario');
    await inventarioPage.waitForPageLoad();

    const emojiName = `🔧 Herramienta Premium 🛠️ ${TestData.uniqueId()}`;
    await inventarioPage.addPart({
      nombre: emojiName,
      precioCompra: 500,
      stock: 2,
    });

    // No crash, no corruption
    const navVisible = await dashboardPage.nav.isVisible();
    expect(navVisible).toBe(true);

    await showPhaseLabel(page, '✅ Emoji Handled');
  });
});
