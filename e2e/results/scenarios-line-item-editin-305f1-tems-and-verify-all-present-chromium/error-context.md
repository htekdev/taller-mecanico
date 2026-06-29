# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scenarios\line-item-editing.spec.ts >> Line Item Editing >> add multiple line items and verify all present
- Location: e2e\tests\scenarios\line-item-editing.spec.ts:55:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('nav').getByRole('button', { name: 'Cotizaciones' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: 🔧
      - heading "Taller Mecánico" [level=1] [ref=e7]
      - paragraph [ref=e8]: Sistema de Gestión
    - generic [ref=e9]:
      - generic [ref=e10]:
        - button "Iniciar Sesión" [ref=e11]
        - button "Crear Cuenta" [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: Correo electrónico
          - textbox "correo@ejemplo.com" [ref=e16]: sofia@test.com
        - generic [ref=e17]:
          - generic [ref=e18]: Contraseña
          - textbox "Mínimo 6 caracteres" [ref=e19]: Test1234!
        - button "Procesando..." [disabled] [ref=e20]
    - paragraph [ref=e21]: Taller Mecánico · Sistema privado para uso del taller
```

# Test source

```ts
  1   | import type { Page, Locator } from '@playwright/test';
  2   | import { BasePage } from './BasePage';
  3   | 
  4   | /**
  5   |  * DashboardPage — Main application shell after login.
  6   |  *
  7   |  * Handles sidebar/tab navigation, user info display, logout,
  8   |  * and module switching.
  9   |  */
  10  | 
  11  | export type ModuleKey =
  12  |   | 'clientes' | 'inventario' | 'trabajos' | 'proveedores'
  13  |   | 'ordenes' | 'facturas' | 'cuentas' | 'pagos'
  14  |   | 'resumen' | 'gastos' | 'historial' | 'cotizaciones' | 'configuracion';
  15  | 
  16  | export const MODULE_LABELS: Record<ModuleKey, string> = {
  17  |   clientes: 'Clientes',
  18  |   inventario: 'Inventario',
  19  |   trabajos: 'Trabajos',
  20  |   proveedores: 'Proveedores',
  21  |   ordenes: 'Órdenes de Compra',
  22  |   facturas: 'Facturas',
  23  |   cuentas: 'Por Cobrar',
  24  |   pagos: 'Por Pagar',
  25  |   resumen: 'Resumen',
  26  |   gastos: 'Gastos',
  27  |   historial: 'Historial',
  28  |   cotizaciones: 'Cotizaciones',
  29  |   configuracion: 'Configuración',
  30  | };
  31  | 
  32  | export class DashboardPage extends BasePage {
  33  |   // ─── Locators ──────────────────────────────────────────────────────────────
  34  |   readonly nav: Locator;
  35  |   readonly logoutButton: Locator;
  36  |   readonly userEmail: Locator;
  37  |   readonly headerTitle: Locator;
  38  |   readonly loadingIndicator: Locator;
  39  | 
  40  |   constructor(page: Page) {
  41  |     super(page);
  42  |     this.nav = page.locator('nav');
  43  |     this.logoutButton = page.getByRole('button', { name: /salir/i });
  44  |     this.userEmail = page.locator('.text-slate-500.text-xs');
  45  |     this.headerTitle = page.locator('h1:has-text("Taller Mecánico")');
  46  |     this.loadingIndicator = page.getByText('Cargando datos...');
  47  |   }
  48  | 
  49  |   async waitForPageLoad() {
  50  |     // Wait for nav to appear (indicates dashboard loaded with taller)
  51  |     await this.nav.waitFor({ state: 'visible', timeout: 20_000 }).catch(async () => {
  52  |       // If nav doesn't appear, we might be on setup page
  53  |       // Try navigating to root
  54  |       await this.page.goto('/');
  55  |       await this.page.waitForLoadState('domcontentloaded');
  56  |       await this.nav.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  57  |     });
  58  |     // Wait for data to finish loading
  59  |     await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
  60  |   }
  61  | 
  62  |   /** Navigate to the dashboard directly (assumes logged in). */
  63  |   async goto() {
  64  |     await this.navigate('/');
  65  |     await this.waitForPageLoad();
  66  |   }
  67  | 
  68  |   /** Navigate to a specific module tab. */
  69  |   async navigateToModule(module: ModuleKey) {
  70  |     const label = MODULE_LABELS[module];
  71  |     const tab = this.nav.getByRole('button', { name: label });
> 72  |     await tab.click();
      |               ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  73  |     // Wait for the tab to become active
  74  |     await tab.waitFor({ state: 'visible' });
  75  |     // Small delay for module content to render
  76  |     await this.page.waitForTimeout(500);
  77  |   }
  78  | 
  79  |   /** Get the active tab's module key. */
  80  |   async getActiveModule(): Promise<string | null> {
  81  |     const activeTab = this.nav.locator('button.bg-indigo-600');
  82  |     const text = await activeTab.textContent();
  83  |     if (!text) return null;
  84  |     // Find which module matches the text
  85  |     for (const [key, label] of Object.entries(MODULE_LABELS)) {
  86  |       if (text.includes(label)) return key;
  87  |     }
  88  |     return null;
  89  |   }
  90  | 
  91  |   /** Get the badge count for a specific module tab. */
  92  |   async getModuleBadge(module: ModuleKey): Promise<string | null> {
  93  |     const label = MODULE_LABELS[module];
  94  |     const tab = this.nav.getByRole('button', { name: label });
  95  |     const badge = tab.locator('span.text-xs.font-bold');
  96  |     if (await badge.isVisible().catch(() => false)) {
  97  |       return badge.textContent();
  98  |     }
  99  |     return null;
  100 |   }
  101 | 
  102 |   /** Logout the current user. */
  103 |   async logout() {
  104 |     await this.logoutButton.click();
  105 |     // Wait for redirect to login page
  106 |     await this.page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10_000 });
  107 |   }
  108 | 
  109 |   /** Get the currently displayed user email. */
  110 |   async getUserEmail(): Promise<string> {
  111 |     return this.getText(this.userEmail);
  112 |   }
  113 | 
  114 |   /** Check if data is still loading. */
  115 |   async isLoading(): Promise<boolean> {
  116 |     return this.isVisible(this.loadingIndicator);
  117 |   }
  118 | 
  119 |   /** Get the tab locator for a given module. */
  120 |   getTabLocator(module: ModuleKey): Locator {
  121 |     return this.nav.getByRole('button', { name: MODULE_LABELS[module] });
  122 |   }
  123 | }
  124 | 
```