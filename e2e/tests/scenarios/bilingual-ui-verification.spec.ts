import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

/**
 * Bilingual UI Verification — Systematic Spanish language check across all modules.
 *
 * The Taller Mecánico app is exclusively Spanish. This spec is a regression guard:
 * if any module's section title, tab label, or empty-state text breaks (shows English,
 * undefined, or raw error), this spec catches it.
 *
 * Tests:
 *  1. Clientes — shows Spanish section title
 *  2. Inventario — shows Spanish section title
 *  3. Trabajos — shows Spanish section title
 *  4. Proveedores — shows Spanish section title
 *  5. Órdenes de Compra — shows Spanish section title
 *  6. Facturas — shows Spanish section title
 *  7. Cuentas por Cobrar — shows Spanish section title
 *  8. Pagos — shows Spanish section title / filter label
 *  9. Resumen Financiero — shows Spanish section title
 * 10. Gastos — shows Spanish section title
 * 11. Historial — shows Spanish section title
 * 12. Cotizaciones — shows Spanish section title
 * 13. Configuración — shows Spanish section title
 * 14. Nav tabs render entirely in Spanish (no English labels)
 * 15. No module shows English-only error messages
 */

// Helper: returns true if at least one pattern is visible on the page
async function hasVisible(page: any, patterns: RegExp[]): Promise<boolean> {
  for (const pattern of patterns) {
    try {
      if (await page.getByText(pattern).first().isVisible()) return true;
    } catch { /* continue */ }
  }
  return false;
}

const MODULES: Array<{
  key: string;
  label: string;
  spanishPatterns: RegExp[];
}> = [
  {
    key: 'clientes',
    label: 'Clientes',
    spanishPatterns: [/Clientes/i, /Nuevo Cliente/i, /No hay clientes/i, /Buscar cliente/i],
  },
  {
    key: 'inventario',
    label: 'Inventario',
    spanishPatterns: [/Inventario/i, /Refacciones/i, /Nueva Refacción/i, /No hay refacciones/i, /Stock/i],
  },
  {
    key: 'trabajos',
    label: 'Trabajos',
    spanishPatterns: [/Trabajos/i, /Nuevo Trabajo/i, /No hay trabajos/i, /Orden de Trabajo/i],
  },
  {
    key: 'proveedores',
    label: 'Proveedores',
    spanishPatterns: [/Proveedores/i, /Nuevo Proveedor/i, /No hay proveedores/i, /Proveedor/i],
  },
  {
    key: 'ordenes',
    label: 'Órdenes',
    spanishPatterns: [/Órdenes de Compra/i, /Ordenes de Compra/i, /Nueva Orden/i, /No hay órdenes/i, /Orden/i],
  },
  {
    key: 'facturas',
    label: 'Facturas',
    spanishPatterns: [/Facturas/i, /Nueva Factura/i, /No hay facturas/i, /Factura/i],
  },
  {
    key: 'cuentas',
    label: 'Cuentas',
    spanishPatterns: [/Cuentas/i, /Por Cobrar/i, /Cobrar/i, /Saldo/i, /No hay cuentas/i],
  },
  {
    key: 'pagos',
    label: 'Pagos',
    spanishPatterns: [/Pagos/i, /Pago/i, /Cuentas por Pagar/i, /No hay pagos/i, /Registrar Pago/i],
  },
  {
    key: 'resumen',
    label: 'Resumen',
    spanishPatterns: [/Resumen/i, /Financiero/i, /Ingresos/i, /Gastos/i, /Ganancias/i],
  },
  {
    key: 'gastos',
    label: 'Gastos',
    spanishPatterns: [/Gastos/i, /Nuevo Gasto/i, /No hay gastos/i, /Categoría/i],
  },
  {
    key: 'historial',
    label: 'Historial',
    spanishPatterns: [/Historial/i, /No hay historial/i, /Trabajos Realizados/i, /Buscar/i],
  },
  {
    key: 'cotizaciones',
    label: 'Cotizaciones',
    spanishPatterns: [/Cotizaciones/i, /Nueva Cotización/i, /No hay cotizaciones/i, /Cotización/i],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    spanishPatterns: [/Configuración/i, /Configuracion/i, /Taller/i, /Nombre del Taller/i, /Ajustes/i],
  },
];

test.describe('Bilingual UI Verification — All Modules Spanish', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsTestUser();
  });

  for (const module of MODULES) {
    test(`${module.label} shows Spanish content`, async ({ page, dashboardPage }) => {
      test.slow(); // each module navigateToModule can hit Supabase cold-start
      await showPhaseLabel(page, `🇲🇽 ${module.label}`);
      await dashboardPage.navigateToModule(module.key as any);
      await dashboardPage.waitForPageLoad();
      await page.waitForTimeout(800);

      const found = await hasVisible(page, module.spanishPatterns);
      expect(
        found,
        `${module.label} module must show at least one Spanish label (tried: ${module.spanishPatterns.map(p => p.source).join(', ')})`
      ).toBe(true);

      await showPhaseLabel(page, `✅ ${module.label} español OK`);
    });
  }

  test('navigation tabs render in Spanish — no English labels', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🧭 Nav Labels Spanish Check');
    await dashboardPage.navigateToModule('clientes');
    await dashboardPage.waitForPageLoad();
    await page.waitForTimeout(500);

    // Nav should NOT contain common English-only labels that would indicate a translation failure
    const navText = await page.locator('nav').innerText().catch(() => '');
    const forbiddenEnglishNavLabels = ['Clients', 'Inventory', 'Jobs', 'Suppliers', 'Orders', 'Billing', 'Settings'];
    for (const label of forbiddenEnglishNavLabels) {
      expect(navText, `Nav must not contain English label "${label}"`).not.toContain(label);
    }

    // Should contain at least some Spanish nav items
    const hasSpanishNav = [/Clientes/i, /Inventario/i, /Trabajos/i, /Proveedores/i, /Gastos/i]
      .some(p => p.test(navText));
    expect(hasSpanishNav, 'Nav must contain Spanish tab labels').toBe(true);

    await showPhaseLabel(page, '✅ Nav Labels OK');
  });

  test('no module shows English-only error messages on fresh load', async ({
    page, dashboardPage,
  }) => {
    await showPhaseLabel(page, '🚫 English Error Check');

    const englishErrorPatterns = [
      'Error loading',
      'Something went wrong',
      'Failed to fetch',
      'Cannot read',
      'is not a function',
      'undefined is not',
    ];

    // Spot-check 3 modules: clientes, inventario, trabajos
    for (const key of ['clientes', 'inventario', 'trabajos'] as const) {
      await dashboardPage.navigateToModule(key);
      await dashboardPage.waitForPageLoad();
      await page.waitForTimeout(500);

      const bodyText = await page.locator('body').innerText().catch(() => '');
      for (const pattern of englishErrorPatterns) {
        expect(bodyText, `Module "${key}" must not show English error: "${pattern}"`).not.toContain(pattern);
      }
    }

    await showPhaseLabel(page, '✅ No English Error Messages');
  });
});