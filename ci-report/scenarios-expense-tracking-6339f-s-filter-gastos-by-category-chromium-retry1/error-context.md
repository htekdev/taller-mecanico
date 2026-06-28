# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scenarios/expense-tracking.spec.ts >> Expense Tracking (Gastos) >> filter gastos by category
- Location: e2e/tests/scenarios/expense-tracking.spec.ts:57:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /guardar/i })
    - locator resolved to <button disabled type="button" class="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-sm ">✓ Guardar</button>
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
        - button "📦 Inventario ⚠ 34" [ref=e19]:
          - generic [ref=e20]: 📦
          - generic [ref=e21]: Inventario
          - generic [ref=e22]: ⚠ 34
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
        - generic [ref=e65]:
          - heading "Gastos" [level=2] [ref=e66]
          - paragraph [ref=e67]: Junio de 2026 · 0 gastos registrados
        - generic [ref=e69]:
          - generic [ref=e70]:
            - generic [ref=e71]:
              - generic [ref=e72]: Categoría
              - combobox [ref=e73]:
                - option "🏠 Operativos" [selected]
                - option "🌐 Administrativos"
                - option "🧾 Impuestos"
                - option "👷 Nómina"
            - generic [ref=e74]:
              - generic [ref=e75]: Subcategoría
              - combobox [ref=e76]:
                - option "Renta" [selected]
                - option "Agua"
                - option "Luz / CFE"
                - option "Internet"
                - option "Comida empleados"
                - option "Herramientas"
                - option "Materiales"
                - option "Otro"
                - option "✏️ Otros (escribir...)"
          - generic [ref=e77]:
            - generic [ref=e78]: Concepto *
            - textbox "ej. 🏠 Renta — Junio 2026" [ref=e79]
          - generic [ref=e80]:
            - generic [ref=e81]:
              - generic [ref=e82]: Monto ($) *
              - spinbutton [active] [ref=e83]: "2428"
            - generic [ref=e84]:
              - generic [ref=e85]: Fecha *
              - textbox [ref=e86]: 2026-06-28
          - generic [ref=e87]:
            - generic [ref=e88]: Notas (opcional)
            - textbox "Referencia, proveedor, número de factura..." [ref=e89]: Gasto E2E mqxjcegjdqf7
          - generic [ref=e90]:
            - button "✓ Guardar" [disabled] [ref=e91]
            - button "Cancelar" [ref=e92]
        - generic [ref=e93]:
          - generic [ref=e94]:
            - generic [ref=e95]: Total del mes
            - generic [ref=e96]: $0.00
          - generic [ref=e97]:
            - button "🏠 Operativos $0.00" [ref=e98]:
              - generic [ref=e99]: 🏠
              - generic [ref=e100]: Operativos
              - generic [ref=e101]: $0.00
            - button "🌐 Administrativos $0.00" [ref=e102]:
              - generic [ref=e103]: 🌐
              - generic [ref=e104]: Administrativos
              - generic [ref=e105]: $0.00
            - button "🧾 Impuestos $0.00" [ref=e106]:
              - generic [ref=e107]: 🧾
              - generic [ref=e108]: Impuestos
              - generic [ref=e109]: $0.00
            - button "👷 Nómina $0.00" [ref=e110]:
              - generic [ref=e111]: 👷
              - generic [ref=e112]: Nómina
              - generic [ref=e113]: $0.00
        - generic [ref=e114]:
          - button "📋 Todos" [ref=e115]
          - button "🏠 Operativos(0)" [ref=e116]:
            - text: 🏠 Operativos
            - generic [ref=e117]: (0)
          - button "🌐 Administrativos(0)" [ref=e118]:
            - text: 🌐 Administrativos
            - generic [ref=e119]: (0)
          - button "🧾 Impuestos(0)" [ref=e120]:
            - text: 🧾 Impuestos
            - generic [ref=e121]: (0)
          - button "👷 Nómina(0)" [ref=e122]:
            - text: 👷 Nómina
            - generic [ref=e123]: (0)
        - generic [ref=e125]:
          - generic [ref=e126]: 💸
          - paragraph [ref=e127]: Sin gastos registrados
          - paragraph [ref=e128]: Registra los gastos del mes para calcular la utilidad neta.
          - button "+ Agregar primer gasto" [ref=e129]
```

# Test source

```ts
  1   | import type { Page, Locator } from '@playwright/test';
  2   | import { BasePage } from './BasePage';
  3   | 
  4   | /**
  5   |  * GastosPage — Manages the expenses (Gastos) module.
  6   |  *
  7   |  * Covers: adding expenses with categories/subcategories,
  8   |  * filtering, editing, monthly totals.
  9   |  */
  10  | export class GastosPage extends BasePage {
  11  |   readonly sectionTitle: Locator;
  12  |   readonly categoriaSelect: Locator;
  13  |   readonly subcategoriaSelect: Locator;
  14  |   readonly conceptoInput: Locator;
  15  |   readonly montoInput: Locator;
  16  |   readonly fechaInput: Locator;
  17  |   readonly notasInput: Locator;
  18  |   readonly guardarButton: Locator;
  19  |   readonly cancelarButton: Locator;
  20  |   readonly nuevoGastoButton: Locator;
  21  |   readonly filtroCategoriaSelect: Locator;
  22  |   readonly gastosList: Locator;
  23  |   readonly totalMensual: Locator;
  24  | 
  25  |   constructor(page: Page) {
  26  |     super(page);
  27  |     this.sectionTitle = page.locator('h2:has-text("Gastos")');
  28  |     this.categoriaSelect = page.locator('select').first();
  29  |     this.subcategoriaSelect = page.locator('select').nth(1);
  30  |     // Concepto input is after "Concepto" label — use nth input (not type=number, not type=date)
  31  |     this.conceptoInput = page.locator('input:not([type="number"]):not([type="date"]):not([type="hidden"])').nth(1);
  32  |     this.montoInput = page.locator('input[type="number"]').first();
  33  |     this.fechaInput = page.locator('input[type="date"]').first();
  34  |     this.notasInput = page.locator('input[placeholder*="Referencia" i], input[placeholder*="notas" i]').first();
  35  |     this.guardarButton = page.getByRole('button', { name: /guardar/i });
  36  |     this.cancelarButton = page.getByRole('button', { name: /cancelar/i });
  37  |     this.nuevoGastoButton = page.getByRole('button', { name: /nuevo gasto|agregar primer gasto/i }).first();
  38  |     this.filtroCategoriaSelect = page.locator('select:has(option:has-text("Todos"))').first();
  39  |     this.gastosList = page.locator('.space-y-2, .divide-y').first();
  40  |     this.totalMensual = page.locator('text=/Total.*\\$[\\d,.]+/').first();
  41  |   }
  42  | 
  43  |   async waitForPageLoad() {
  44  |     await this.sectionTitle.waitFor({ state: 'visible', timeout: 15_000 });
  45  |   }
  46  | 
  47  |   /** Add a new expense. */
  48  |   async addExpense(data: {
  49  |     categoria?: string;
  50  |     concepto: string;
  51  |     monto: number;
  52  |     fecha?: string;
  53  |     notas?: string;
  54  |   }) {
  55  |     // If there's a "Nuevo Gasto" button, click it first
  56  |     if (await this.nuevoGastoButton.isVisible().catch(() => false)) {
  57  |       await this.nuevoGastoButton.click();
  58  |       await this.page.waitForTimeout(500);
  59  |     }
  60  | 
  61  |     if (data.categoria && await this.categoriaSelect.isVisible().catch(() => false)) {
  62  |       // Category options have value=key (e.g., 'operativo') and label='🏠 Operativos'
  63  |       await this.categoriaSelect.selectOption({ value: data.categoria });
  64  |       await this.page.waitForTimeout(300);
  65  |     }
  66  | 
  67  |     if (await this.conceptoInput.isVisible().catch(() => false)) {
  68  |       await this.fillInput(this.conceptoInput, data.concepto);
  69  |     }
  70  | 
  71  |     if (await this.montoInput.isVisible().catch(() => false)) {
  72  |       await this.fillInput(this.montoInput, String(data.monto));
  73  |     }
  74  | 
  75  |     if (data.fecha && await this.fechaInput.isVisible().catch(() => false)) {
  76  |       await this.fillInput(this.fechaInput, data.fecha);
  77  |     }
  78  | 
  79  |     if (data.notas && await this.notasInput.isVisible().catch(() => false)) {
  80  |       await this.fillInput(this.notasInput, data.notas);
  81  |     }
  82  | 
> 83  |     await this.guardarButton.click();
      |                              ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  84  |     await this.page.waitForTimeout(2000);
  85  |   }
  86  | 
  87  |   /** Filter gastos by category. */
  88  |   async filterByCategoria(categoria: string) {
  89  |     if (await this.filtroCategoriaSelect.isVisible().catch(() => false)) {
  90  |       await this.filtroCategoriaSelect.selectOption({ label: categoria });
  91  |       await this.page.waitForTimeout(500);
  92  |     }
  93  |   }
  94  | 
  95  |   /** Get count of visible expenses. */
  96  |   async getExpenseCount(): Promise<number> {
  97  |     const items = this.page.locator('.border.rounded-lg:has(text=/\\$/), .border.rounded-xl:has(text=/\\$/), [data-testid="gasto-item"]');
  98  |     return items.count();
  99  |   }
  100 | 
  101 |   /** Get the monthly total text. */
  102 |   async getMonthlyTotal(): Promise<string> {
  103 |     return this.getText(this.totalMensual);
  104 |   }
  105 | 
  106 |   /** Check if module loaded successfully (no errors). */
  107 |   async isModuleHealthy(): Promise<boolean> {
  108 |     const errorVisible = await this.page.locator('.bg-rose-50, .text-red-600').first()
  109 |       .isVisible().catch(() => false);
  110 |     const titleVisible = await this.sectionTitle.isVisible().catch(() => false);
  111 |     return titleVisible && !errorVisible;
  112 |   }
  113 | }
  114 | 
```