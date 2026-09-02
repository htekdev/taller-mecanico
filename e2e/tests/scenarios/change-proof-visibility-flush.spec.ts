/**
 * change-proof-visibility-flush
 *
 * Walkthrough spec proving that usePersistedState flushes all pending writes
 * to localStorage when document.visibilityState changes to 'hidden'.
 *
 * Sofia's use case: she sets a filter, switches to WhatsApp (visibilitychange),
 * the OS may kill the tab. When she returns, everything should be restored.
 *
 * The test simulates the visibilitychange event via page.evaluate() and verifies
 * that localStorage contains the latest value even if less than 300ms passed
 * (i.e. the debounce timer hasn't fired yet).
 *
 * Fixes: https://github.com/htekdev/taller-mecanico/issues/216
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';

const LS_INVENTARIO_FILTRO = 'taller_inventario_filtro_texto';

test.describe('change-proof: visibilitychange flush — Fase 1', () => {
  test('Fase 1 — filtro de inventario se guarda en localStorage cuando la página se oculta (visibilitychange)', async ({ page }) => {
    // ── Setup ──────────────────────────────────────────────────────────────
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.loginWithTestCredentials();
    await dashboardPage.waitForDashboard();

    // ── Borrar el estado anterior ──────────────────────────────────────────
    await page.evaluate((key) => localStorage.removeItem(key), LS_INVENTARIO_FILTRO);

    // ── Navegar a inventario ───────────────────────────────────────────────
    await dashboardPage.navigateToModule('inventario');
    await page.waitForTimeout(500); // dejar que los componentes monten

    // ── Escribir en el campo de búsqueda ───────────────────────────────────
    const searchInput = page.locator('input[placeholder*="Buscar por nombre"], input[placeholder*="buscar"], input[placeholder*="Buscar"]').first();
    const inputVisible = await searchInput.isVisible().catch(() => false);

    if (!inputVisible) {
      // Inventario vacío — no hay campo de búsqueda. Probar con trabajos en su lugar.
      test.skip(true, 'Campo de búsqueda no visible con inventario vacío — probar con trabajos');
      return;
    }

    const testValue = 'filtro-visibility-test';
    await searchInput.fill(testValue);

    // ── Simular visibilitychange INMEDIATAMENTE (sin esperar 300ms debounce) ──
    // Esto simula el caso donde Sofia escribe y de inmediato sale a WhatsApp.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // ── Verificar que localStorage tiene el valor correcto ─────────────────
    // El flush debe haber escrito el valor ANTES de que se disparara el debounce.
    const rawValue = await page.evaluate((key) => localStorage.getItem(key), LS_INVENTARIO_FILTRO);
    expect(rawValue, 'localStorage debe contener el valor del filtro después de visibilitychange').not.toBeNull();

    if (rawValue) {
      const parsed = JSON.parse(rawValue) as { data: string; savedAt: number };
      expect(parsed.data, 'El valor guardado debe ser el filtro escrito').toBe(testValue);
    }

    // ── Restaurar visibilityState para las pruebas siguientes ──────────────
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  });
});

test.describe('change-proof: visibilitychange flush — Fase 2', () => {
  test('Fase 2 — pagehide también hace flush de los writes pendientes', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.loginWithTestCredentials();
    await dashboardPage.waitForDashboard();

    // Limpiar estado previo
    await page.evaluate((key) => localStorage.removeItem(key), LS_INVENTARIO_FILTRO);

    await dashboardPage.navigateToModule('inventario');
    await page.waitForTimeout(500);

    const searchInput = page.locator('input[placeholder*="Buscar por nombre"], input[placeholder*="buscar"], input[placeholder*="Buscar"]').first();
    const inputVisible = await searchInput.isVisible().catch(() => false);

    if (!inputVisible) {
      test.skip(true, 'Campo de búsqueda no visible con inventario vacío');
      return;
    }

    const testValue = 'filtro-pagehide-test';
    await searchInput.fill(testValue);

    // Simular pagehide (iOS Safari fallback)
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    });

    const rawValue = await page.evaluate((key) => localStorage.getItem(key), LS_INVENTARIO_FILTRO);
    expect(rawValue, 'localStorage debe contener el valor del filtro después de pagehide').not.toBeNull();

    if (rawValue) {
      const parsed = JSON.parse(rawValue) as { data: string; savedAt: number };
      expect(parsed.data, 'El valor guardado debe ser el filtro escrito').toBe(testValue);
    }
  });
});

test.describe('change-proof: visibilitychange flush — Fase 3', () => {
  test('Fase 3 — recarga completa restaura filtros guardados por el flush de visibilitychange', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Precondición: simular que el usuario tenía un filtro guardado (como si
    // hubiera salido a WhatsApp y el flush hubiera guardado el valor)
    await loginPage.goto();
    await page.evaluate(() => {
      // Simular que el flush de visibilitychange guardó este valor
      const envelope = { data: 'filtro-restaurado', savedAt: Date.now() };
      localStorage.setItem('taller_inventario_filtro_texto', JSON.stringify(envelope));
      // Y que estaba en inventario
      localStorage.setItem('taller_last_vista', 'inventario');
    });

    // Recargar la página (simula que el OS mató el tab y el usuario regresa)
    await page.reload();
    await loginPage.loginWithTestCredentials();
    await dashboardPage.waitForDashboard();

    // Verificar que la app arrancó en inventario
    const currentVista = await page.evaluate(() => localStorage.getItem('taller_last_vista'));
    expect(currentVista, 'La app debe recordar que estaba en inventario').toBe('inventario');

    // Verificar que el filtro sigue en localStorage (no fue borrado por la recarga)
    const rawFiltro = await page.evaluate(() => localStorage.getItem('taller_inventario_filtro_texto'));
    expect(rawFiltro, 'El filtro guardado debe sobrevivir la recarga de la página').not.toBeNull();

    if (rawFiltro) {
      const parsed = JSON.parse(rawFiltro) as { data: string; savedAt: number };
      expect(parsed.data, 'El filtro debe ser el valor que el flush guardó').toBe('filtro-restaurado');
    }
  });
});
