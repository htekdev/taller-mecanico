# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scenarios/proveedor-crud.spec.ts >> Proveedor CRUD >> add proveedor with full details
- Location: e2e/tests/scenarios/proveedor-crud.spec.ts:21:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /agregar proveedor/i })
    - locator resolved to <button disabled type="submit" class="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-sm w-full">+ Agregar Proveedor</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    29 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: 🔧
        - generic [ref=e7]:
          - heading "Taller Mecánico" [level=1] [ref=e8]
          - paragraph [ref=e9]: Taller Diesel Mérida
        - generic [ref=e10]:
          - generic [ref=e11]: sofia@test.com
          - button "Salir" [ref=e12]
    - generic [ref=e13]:
      - navigation [ref=e14]:
        - button "👥 Clientes 29" [ref=e15]:
          - generic [ref=e16]: 👥
          - generic [ref=e17]: Clientes
          - generic [ref=e18]: "29"
        - button "📦 Inventario ⚠ 36" [ref=e19]:
          - generic [ref=e20]: 📦
          - generic [ref=e21]: Inventario
          - generic [ref=e22]: ⚠ 36
        - button "🔧 Trabajos 🕐 7" [ref=e23]:
          - generic [ref=e24]: 🔧
          - generic [ref=e25]: Trabajos
          - generic [ref=e26]: 🕐 7
        - button "🏪 Proveedores 2" [ref=e27]:
          - generic [ref=e28]: 🏪
          - generic [ref=e29]: Proveedores
          - generic [ref=e30]: "2"
        - button "📋 Órdenes de Compra 4" [ref=e31]:
          - generic [ref=e32]: 📋
          - generic [ref=e33]: Órdenes de Compra
          - generic [ref=e34]: "4"
        - button "🧾 Facturas 4" [ref=e35]:
          - generic [ref=e36]: 🧾
          - generic [ref=e37]: Facturas
          - generic [ref=e38]: "4"
        - button "💰 Por Cobrar 4" [ref=e39]:
          - generic [ref=e40]: 💰
          - generic [ref=e41]: Por Cobrar
          - generic [ref=e42]: "4"
        - button "🔴 Por Pagar 3" [ref=e43]:
          - generic [ref=e44]: 🔴
          - generic [ref=e45]: Por Pagar
          - generic [ref=e46]: "3"
        - button "📊 Resumen" [ref=e47]:
          - generic [ref=e48]: 📊
          - generic [ref=e49]: Resumen
        - button "💸 Gastos" [ref=e50]:
          - generic [ref=e51]: 💸
          - generic [ref=e52]: Gastos
        - button "📋 Historial" [ref=e53]:
          - generic [ref=e54]: 📋
          - generic [ref=e55]: Historial
        - button "📄 Cotizaciones" [ref=e56]:
          - generic [ref=e57]: 📄
          - generic [ref=e58]: Cotizaciones
        - button "⚙️ Configuración" [ref=e59]:
          - generic [ref=e60]: ⚙️
          - generic [ref=e61]: Configuración
      - generic [ref=e63]:
        - generic [ref=e64]:
          - heading "Proveedores" [level=2] [ref=e65]
          - paragraph [ref=e66]: Registra tus proveedores de refacciones para vincularlos al inventario y rastrear lo que les debes.
        - generic [ref=e67]:
          - heading "Nuevo Proveedor" [level=3] [ref=e68]
          - generic [ref=e69]:
            - generic [ref=e70]:
              - generic [ref=e71]: Nombre *
              - textbox "Ej. Refacciones García" [ref=e72]
            - generic [ref=e73]:
              - generic [ref=e74]: Teléfono
              - textbox "Ej. 555-100-2000" [active] [ref=e75]: 999-mqx-jntn
            - generic [ref=e76]:
              - generic [ref=e77]: Contacto
              - textbox "Nombre del vendedor" [ref=e78]: Proveedor E2E mqxjntnkz4v3
            - button "+ Agregar Proveedor" [disabled] [ref=e80]
        - generic [ref=e81]:
          - generic [ref=e82]:
            - generic [ref=e83]: Proveedor
            - combobox [ref=e84]:
              - option "Todos los proveedores" [selected]
              - option "AutoParts Mérida"
              - option "Distribuidora del Sureste"
          - table [ref=e86]:
            - rowgroup [ref=e87]:
              - row "Proveedor Teléfono Contacto Refacciones en inventario" [ref=e88]:
                - columnheader "Proveedor" [ref=e89]
                - columnheader "Teléfono" [ref=e90]
                - columnheader "Contacto" [ref=e91]
                - columnheader "Refacciones en inventario" [ref=e92]
            - rowgroup [ref=e93]:
              - row "AutoParts Mérida 9991234567 Luis Ortega Sin refacciones" [ref=e94]:
                - cell "AutoParts Mérida" [ref=e95]
                - cell "9991234567" [ref=e96]
                - cell "Luis Ortega" [ref=e97]
                - cell "Sin refacciones" [ref=e98]
              - row "Distribuidora del Sureste 9997654321 Ana García Sin refacciones" [ref=e99]:
                - cell "Distribuidora del Sureste" [ref=e100]
                - cell "9997654321" [ref=e101]
                - cell "Ana García" [ref=e102]
                - cell "Sin refacciones" [ref=e103]
  - generic: ✓ 1 passed
```

# Test source

```ts
  1  | import type { Page, Locator } from '@playwright/test';
  2  | import { BasePage } from './BasePage';
  3  | 
  4  | /**
  5  |  * ProveedoresPage — Manages the suppliers (Proveedores) module.
  6  |  *
  7  |  * Covers: viewing suppliers, adding new suppliers.
  8  |  */
  9  | export class ProveedoresPage extends BasePage {
  10 |   readonly sectionTitle: Locator;
  11 |   readonly nombreInput: Locator;
  12 |   readonly contactoInput: Locator;
  13 |   readonly telefonoInput: Locator;
  14 |   readonly emailInput: Locator;
  15 |   readonly agregarButton: Locator;
  16 |   readonly proveedoresList: Locator;
  17 | 
  18 |   constructor(page: Page) {
  19 |     super(page);
  20 |     this.sectionTitle = page.locator('h2:has-text("Proveedores")');
  21 |     this.nombreInput = page.locator('input[placeholder*="nombre" i]').first();
  22 |     this.contactoInput = page.locator('input[placeholder*="contacto" i]').first();
  23 |     this.telefonoInput = page.locator('input[type="tel"], input[placeholder*="teléfono" i]').first();
  24 |     this.emailInput = page.locator('input[type="email"], input[placeholder*="correo" i]').first();
  25 |     this.agregarButton = page.getByRole('button', { name: /agregar proveedor/i });
  26 |     this.proveedoresList = page.locator('.space-y-2, .divide-y, .grid').first();
  27 |   }
  28 | 
  29 |   async waitForPageLoad() {
  30 |     await this.sectionTitle.waitFor({ state: 'visible', timeout: 15_000 });
  31 |   }
  32 | 
  33 |   /** Add a new proveedor. */
  34 |   async addProveedor(data: { nombre: string; contacto?: string; telefono?: string; email?: string }) {
  35 |     await this.fillInput(this.nombreInput, data.nombre);
  36 |     if (data.contacto && await this.contactoInput.isVisible().catch(() => false)) {
  37 |       await this.fillInput(this.contactoInput, data.contacto);
  38 |     }
  39 |     if (data.telefono && await this.telefonoInput.isVisible().catch(() => false)) {
  40 |       await this.fillInput(this.telefonoInput, data.telefono);
  41 |     }
  42 |     if (data.email && await this.emailInput.isVisible().catch(() => false)) {
  43 |       await this.fillInput(this.emailInput, data.email);
  44 |     }
> 45 |     await this.agregarButton.click();
     |                              ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  46 |     await this.page.waitForTimeout(2000);
  47 |   }
  48 | 
  49 |   /** Get count of proveedores in the list. */
  50 |   async getProveedorCount(): Promise<number> {
  51 |     const items = this.page.locator('.border.rounded-lg, .border.rounded-xl, [data-testid="proveedor-item"]');
  52 |     return items.count();
  53 |   }
  54 | 
  55 |   /** Check if a proveedor is visible. */
  56 |   async isProveedorVisible(name: string): Promise<boolean> {
  57 |     return this.page.locator(`text=${name}`).first().isVisible().catch(() => false);
  58 |   }
  59 | }
  60 | 
```