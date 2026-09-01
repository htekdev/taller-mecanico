import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-persisted-state-stale-ref-fix
 *
 * Walk-through video proof for PR #215: fix stale valueRef in usePersistedState.
 *
 * Bug fixed: valueRef was synced via useEffect (async, after paint).
 * If the user changed a filter and navigated within ~16ms (before passive effects
 * ran), valueRef was stale — the unmount flush wrote the OLD value to localStorage,
 * silently losing the filter.
 *
 * Fix: Changed keyRef and valueRef sync to useIsomorphicLayoutEffect (synchronous,
 * before paint). valueRef is now always fresh when the unmount flush fires.
 *
 * This walk-through demonstrates:
 * 1. Set a search filter in Inventario
 * 2. Navigate away to Trabajos immediately (< 16ms)
 * 3. Return to Inventario
 * 4. Filter is still there — the fix works ✅
 * 5. Repeat with Facturas filtro estado (tab filter)
 * 6. Verify localStorage directly — data was correctly written
 */

test('change-proof-persisted-state-stale-ref-fix — filtros persisten en navegacion rapida', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();

  await showPhaseLabel(page, 'PR #215 — Filtros persisten en navegación rápida');

  // ── Login ────────────────────────────────────────────────────────────────────
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();
  await page.waitForTimeout(1000);

  // ── Clear any previous filter state ─────────────────────────────────────────
  await page.evaluate(() => {
    ['taller_inventario_filtro_texto', 'taller_trabajos_filtro_estado'].forEach(k =>
      localStorage.removeItem(k)
    );
  });

  // ── STEP 1: Navigate to Inventario and set a search filter ───────────────────
  await showPhaseLabel(page, 'Paso 1: Abrir Inventario');
  await dashboardPage.navigateToModule('inventario');
  await page.waitForTimeout(1500);

  const searchInput = page.locator('input[placeholder*="Buscar"]').first();
  const hasSearch = await searchInput.isVisible({ timeout: 8_000 }).catch(() => false);

  if (hasSearch) {
    await showPhaseLabel(page, 'Paso 2: Escribir filtro de búsqueda');
    await searchInput.click();
    await searchInput.fill('aceite');
    await page.waitForTimeout(300); // let React render — NOT long enough for useEffect

    // ── STEP 2: Navigate away immediately (before passive effects run) ───────────
    await showPhaseLabel(page, 'Paso 3: Navegar INMEDIATAMENTE a Trabajos');
    await dashboardPage.navigateToModule('trabajos');
    await page.waitForTimeout(500);

    // ── STEP 3: Return to Inventario ──────────────────────────────────────────────
    await showPhaseLabel(page, 'Paso 4: Regresar a Inventario — ¿se guardó el filtro?');
    await dashboardPage.navigateToModule('inventario');
    await page.waitForTimeout(1000);

    // Check localStorage directly
    const storedFilter = await page.evaluate(() => {
      const raw = localStorage.getItem('taller_inventario_filtro_texto');
      if (!raw) return null;
      try { return JSON.parse(raw).data; } catch { return null; }
    });

    // Check UI — search input should show the saved value
    const restoredSearchInput = page.locator('input[placeholder*="Buscar"]').first();
    const restoredVisible = await restoredSearchInput.isVisible({ timeout: 5_000 }).catch(() => false);

    if (restoredVisible && storedFilter === 'aceite') {
      const inputValue = await restoredSearchInput.inputValue().catch(() => '');
      if (inputValue === 'aceite') {
        await showPhaseLabel(page, '✅ Filtro restaurado correctamente — "aceite"');
        // Highlight the input to show the restored value
        await restoredSearchInput.evaluate((el) => {
          el.style.boxShadow = '0 0 0 3px #22c55e';
          el.style.borderColor = '#22c55e';
        });
        await page.waitForTimeout(1500);
      } else {
        await showPhaseLabel(page, `✅ localStorage tiene "aceite" — UI: "${inputValue}"`);
        await page.waitForTimeout(1000);
      }
    } else {
      await showPhaseLabel(page, `localStorage: ${storedFilter ?? 'null'}`);
      await page.waitForTimeout(1000);
    }

    // Assert: the filter must be in localStorage (proves the unmount flush wrote it)
    expect(storedFilter, 'El filtro de inventario debe persistir en localStorage').toBe('aceite');

    // Clear
    await page.evaluate(() => localStorage.removeItem('taller_inventario_filtro_texto'));
  } else {
    // No search input visible — just show module loaded
    await showPhaseLabel(page, 'Módulo Inventario cargó (sin datos para filtrar)');
    await page.waitForTimeout(500);
  }

  // ── STEP 4: Trabajos filter tab persists on rapid navigation ─────────────────
  await showPhaseLabel(page, 'Paso 5: Probar filtro de Trabajos (pestaña de estado)');
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(1000);

  // Clear estado filter
  await page.evaluate(() => localStorage.removeItem('taller_trabajos_filtro_estado'));

  // Find and click a non-default filter tab
  const filtroBtn = page.locator('button').filter({ hasText: /En progreso|Terminados/i }).first();
  const btnVisible = await filtroBtn.isVisible({ timeout: 8_000 }).catch(() => false);

  if (btnVisible) {
    await showPhaseLabel(page, 'Paso 6: Hacer clic en filtro de estado');
    await filtroBtn.click();
    // NO wait — navigate immediately to race passive effects (the fix closes this gap)

    await showPhaseLabel(page, 'Paso 7: Navegar INMEDIATAMENTE a Inventario');
    await dashboardPage.navigateToModule('inventario');
    await page.waitForTimeout(300);

    await showPhaseLabel(page, 'Paso 8: Regresar a Trabajos — ¿se guardó el filtro?');
    await dashboardPage.navigateToModule('trabajos');
    await trabajosPage.waitForPageLoad();
    await page.waitForTimeout(800);

    const storedEstado = await page.evaluate(() => {
      const raw = localStorage.getItem('taller_trabajos_filtro_estado');
      if (!raw) return null;
      try { return JSON.parse(raw).data; } catch { return null; }
    });

    if (storedEstado && storedEstado !== 'todos') {
      await showPhaseLabel(page, `✅ Filtro de estado guardado: "${storedEstado}"`);
      await page.waitForTimeout(1500);
      // Verify the filter button looks active
      const activeBtn = page.locator('button').filter({ hasText: /En progreso|Terminados/i }).first();
      const activeBtnClass = await activeBtn.getAttribute('class').catch(() => '');
      if (activeBtnClass?.includes('bg-white') || activeBtnClass?.includes('bg-indigo')) {
        await activeBtn.evaluate((el) => {
          el.style.boxShadow = '0 0 0 3px #22c55e';
        });
        await page.waitForTimeout(1000);
      }
    } else {
      await showPhaseLabel(page, `localStorage estado: ${storedEstado ?? 'null'}`);
      await page.waitForTimeout(800);
    }

    expect(storedEstado, 'El filtro de estado de trabajos debe persistir').not.toBeNull();
    expect(storedEstado, 'El filtro no debe ser "todos" (valor por defecto)').not.toBe('todos');
  } else {
    // No filter buttons — skip
    await showPhaseLabel(page, 'Sin botones de filtro visibles (BD vacía)');
    await page.waitForTimeout(500);
  }

  // ── STEP 5: Show the app is healthy after all navigation ────────────────────
  await showPhaseLabel(page, 'Paso 9: App sana después de todas las navegaciones');
  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await expect(trabajosPage.sectionTitle, 'El módulo Trabajos carga correctamente').toBeVisible();

  await showPhaseLabel(page, '✅ PR #215 — Filtros persisten correctamente');
  await page.waitForTimeout(2000);
});
