# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scenarios/multi-cotizacion-workflow.spec.ts >> Multi-Cotización Workflow >> create multiple cotizaciones and verify list management
- Location: e2e/tests/scenarios/multi-cotizacion-workflow.spec.ts:23:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('h2:has-text("Cotizaciones"), button:has-text("General")').first() to be visible

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
        - button "📄 Cotizaciones" [active] [ref=e56]:
          - generic [ref=e57]: 📄
          - generic [ref=e58]: Cotizaciones
        - button "⚙️ Configuración" [ref=e59]:
          - generic [ref=e60]: ⚙️
          - generic [ref=e61]: Configuración
      - generic [ref=e63]:
        - generic [ref=e65]:
          - heading "Cotización COT-033" [level=2] [ref=e66]
          - paragraph [ref=e67]: Guardada — descarga el PDF cuando quieras
        - generic [ref=e68]:
          - button "← Inicio" [ref=e69]
          - button "✏️ Editar" [ref=e70]
          - generic [ref=e71]:
            - generic [ref=e72]:
              - generic [ref=e73]: 📄
              - textbox "nombre-del-archivo" [ref=e74]: COT-033
              - generic [ref=e75]: .pdf
            - button "⬇️ Descargar PDF" [ref=e76]
        - generic [ref=e77]:
          - generic [ref=e78]:
            - img "Logo MJ Mérida" [ref=e79]
            - generic [ref=e80]:
              - generic [ref=e81]: MICRO DIESEL DE MERIDA
              - generic [ref=e82]: Héctor Armando Rocha Sepúlveda
              - generic [ref=e83]: Circuito Colonias No. 752 x 64j y 64k, Col. Castilla Cámara, CP 97278, Mérida, Yucatán
              - generic [ref=e84]: Tel (999) 317.22.46 · Cel. 999 3597970
          - generic [ref=e85]: COTIZACIÓN
          - generic [ref=e86]:
            - generic [ref=e87]:
              - generic [ref=e88]: "No. Cotización:"
              - text: COT-033
            - generic [ref=e89]:
              - generic [ref=e90]: "Fecha:"
              - text: 28/06/2026
            - generic [ref=e91]:
              - generic [ref=e92]: "Cliente:"
              - text: Andrés Flores
            - generic [ref=e93]:
              - generic [ref=e94]: "Marca:"
              - text: Chevrolet
            - generic [ref=e95]:
              - generic [ref=e96]: "Modelo:"
              - text: Corsa
            - generic [ref=e97]:
              - generic [ref=e98]: "Año:"
              - text: "2010"
            - generic [ref=e99]:
              - generic [ref=e100]: "Placas:"
              - text: YUC-987-F
          - generic [ref=e101]:
            - generic [ref=e102]: REFACCIONES
            - table [ref=e103]:
              - rowgroup [ref=e104]:
                - row "No. Cant. Descripción Precio Unit. Total" [ref=e105]:
                  - columnheader "No." [ref=e106]
                  - columnheader "Cant." [ref=e107]
                  - columnheader "Descripción" [ref=e108]
                  - columnheader "Precio Unit." [ref=e109]
                  - columnheader "Total" [ref=e110]
              - rowgroup [ref=e111]:
                - row "1 1 Servicio A mqxjm1x24exo $500.00 $500.00" [ref=e112]:
                  - cell "1" [ref=e113]
                  - cell "1" [ref=e114]
                  - cell "Servicio A mqxjm1x24exo" [ref=e115]
                  - cell "$500.00" [ref=e116]
                  - cell "$500.00" [ref=e117]
              - rowgroup [ref=e118]:
                - 'row "Subtotal: $500.00" [ref=e119]':
                  - cell "Subtotal:" [ref=e120]
                  - cell "$500.00" [ref=e121]
          - generic [ref=e122]:
            - generic [ref=e123]: MANO DE OBRA
            - table [ref=e124]:
              - rowgroup [ref=e125]:
                - row "No. Cant. Descripción Precio Unit. Total" [ref=e126]:
                  - columnheader "No." [ref=e127]
                  - columnheader "Cant." [ref=e128]
                  - columnheader "Descripción" [ref=e129]
                  - columnheader "Precio Unit." [ref=e130]
                  - columnheader "Total" [ref=e131]
              - rowgroup [ref=e132]:
                - row "1 1 $0.00 $0.00" [ref=e133]:
                  - cell "1" [ref=e134]
                  - cell "1" [ref=e135]
                  - cell [ref=e136]
                  - cell "$0.00" [ref=e137]
                  - cell "$0.00" [ref=e138]
              - rowgroup [ref=e139]:
                - 'row "Subtotal: $0.00" [ref=e140]':
                  - cell "Subtotal:" [ref=e141]
                  - cell "$0.00" [ref=e142]
          - generic [ref=e144]:
            - generic [ref=e145]:
              - generic [ref=e146]: "SUBTOTAL:"
              - generic [ref=e147]: $500.00
            - generic [ref=e148]:
              - generic [ref=e149]: "TOTAL:"
              - generic [ref=e150]: $500.00
```

# Test source

```ts
  1   | import type { Page, Locator } from '@playwright/test';
  2   | import { BasePage } from './BasePage';
  3   | 
  4   | /**
  5   |  * CotizacionesPage — Manages the cotizaciones (quotes) module.
  6   |  *
  7   |  * Covers: plantilla selection, form filling, line items,
  8   |  * saving, editing, converting to trabajo, search/filter, history.
  9   |  */
  10  | export class CotizacionesPage extends BasePage {
  11  |   // ─── Section-level locators ────────────────────────────────────────────────
  12  |   readonly sectionTitle: Locator;
  13  |   readonly plantillaGeneral: Locator;
  14  |   readonly plantillaAyuntamiento: Locator;
  15  |   readonly plantillaRedAmbiental: Locator;
  16  | 
  17  |   // ─── Form locators (visible after plantilla selection) ─────────────────────
  18  |   readonly clientSelect: Locator;
  19  |   readonly vehicleSelect: Locator;
  20  |   readonly descripcionInput: Locator;
  21  |   readonly saveButton: Locator;
  22  |   readonly cancelButton: Locator;
  23  |   readonly convertButton: Locator;
  24  |   readonly editButton: Locator;
  25  |   readonly numeroCotizacion: Locator;
  26  | 
  27  |   // ─── Line items ────────────────────────────────────────────────────────────
  28  |   readonly addLineItemButton: Locator;
  29  |   readonly lineItemRows: Locator;
  30  | 
  31  |   // ─── History / list ────────────────────────────────────────────────────────
  32  |   readonly historySection: Locator;
  33  |   readonly searchInput: Locator;
  34  | 
  35  |   constructor(page: Page) {
  36  |     super(page);
  37  |     this.sectionTitle = page.locator('h2:has-text("Cotizaciones")');
  38  |     this.plantillaGeneral = page.getByRole('button', { name: /general/i }).first();
  39  |     this.plantillaAyuntamiento = page.getByRole('button', { name: /ayuntamiento/i }).first();
  40  |     this.plantillaRedAmbiental = page.getByRole('button', { name: /red ambiental/i }).first();
  41  | 
  42  |     this.clientSelect = page.locator('select').first();
  43  |     this.vehicleSelect = page.locator('select').nth(1);
  44  |     this.descripcionInput = page.locator('textarea, input[placeholder*="descripción" i]').first();
  45  |     this.saveButton = page.getByRole('button', { name: /guardar/i });
  46  |     this.cancelButton = page.getByRole('button', { name: /cancelar/i });
  47  |     this.convertButton = page.getByRole('button', { name: /convertir/i }).first();
  48  |     this.editButton = page.getByRole('button', { name: /editar/i }).first();
  49  |     this.numeroCotizacion = page.locator('input[placeholder*="número" i], input[value*="COT-"]').first();
  50  | 
  51  |     this.addLineItemButton = page.getByRole('button', { name: /agregar línea|añadir|agregar item/i });
  52  |     this.lineItemRows = page.locator('[data-testid="line-item"], tr:has(input[type="number"])');
  53  | 
  54  |     this.historySection = page.locator('text=Historial de Cotizaciones').first();
  55  |     this.searchInput = page.locator('input[placeholder*="buscar" i]').first();
  56  |   }
  57  | 
  58  |   async waitForPageLoad() {
  59  |     // Wait for either the plantilla selection or the form to be visible
  60  |     await this.page.locator('h2:has-text("Cotizaciones"), button:has-text("General")').first()
> 61  |       .waitFor({ state: 'visible', timeout: 15_000 });
      |        ^ TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
  62  |   }
  63  | 
  64  |   /** Select the "General" plantilla to open the form. */
  65  |   async selectPlantillaGeneral() {
  66  |     await this.plantillaGeneral.click();
  67  |     // Wait for the form to load (client select appears)
  68  |     await this.clientSelect.waitFor({ state: 'visible', timeout: 15_000 });
  69  |   }
  70  | 
  71  |   /** Select the "Ayuntamiento" plantilla. */
  72  |   async selectPlantillaAyuntamiento() {
  73  |     await this.plantillaAyuntamiento.click();
  74  |     await this.clientSelect.waitFor({ state: 'visible', timeout: 15_000 });
  75  |   }
  76  | 
  77  |   /** Select a client from the dropdown by index. */
  78  |   async selectClient(index = 1) {
  79  |     await this.page.waitForFunction(
  80  |       () => {
  81  |         const sel = document.querySelector('select');
  82  |         return sel && sel.options.length > 1;
  83  |       },
  84  |       { timeout: 15_000 }
  85  |     ).catch(() => {});
  86  |     const optionCount = await this.getOptionCount(this.clientSelect);
  87  |     if (optionCount > 1) {
  88  |       await this.selectByIndex(this.clientSelect, Math.min(index, optionCount - 1));
  89  |     }
  90  |     // Wait for vehicles to load after client selection
  91  |     await this.page.waitForTimeout(1000);
  92  |   }
  93  | 
  94  |   /** Select a vehicle from the dropdown by index. */
  95  |   async selectVehicle(index = 1) {
  96  |     if (await this.vehicleSelect.isVisible().catch(() => false)) {
  97  |       const optionCount = await this.getOptionCount(this.vehicleSelect);
  98  |       if (optionCount > 1) {
  99  |         await this.selectByIndex(this.vehicleSelect, Math.min(index, optionCount - 1));
  100 |       }
  101 |     }
  102 |   }
  103 | 
  104 |   /** Fill the description/notes field. */
  105 |   async fillDescription(text: string) {
  106 |     if (await this.descripcionInput.isVisible().catch(() => false)) {
  107 |       await this.fillInput(this.descripcionInput, text);
  108 |     }
  109 |   }
  110 | 
  111 |   /** Add a line item with description, quantity, and unit price. */
  112 |   async addLineItem(descripcion: string, cantidad: number, precioUnitario: number) {
  113 |     // Click "Agregar" to add a new row
  114 |     if (await this.addLineItemButton.isVisible().catch(() => false)) {
  115 |       await this.addLineItemButton.click();
  116 |       await this.page.waitForTimeout(300);
  117 |     }
  118 |     // Fill the last row
  119 |     const rows = this.page.locator('input[placeholder*="descripción" i], input[placeholder*="concepto" i]');
  120 |     const lastRow = rows.last();
  121 |     if (await lastRow.isVisible().catch(() => false)) {
  122 |       await lastRow.fill(descripcion);
  123 |     }
  124 |     // Fill cantidad and precio in the same row context
  125 |     const cantidadInputs = this.page.locator('input[type="number"][placeholder*="cant" i], input[type="number"]');
  126 |     const precioInputs = this.page.locator('input[type="number"]');
  127 |     // These are positional — fill the latest ones
  128 |     const allNumberInputs = await precioInputs.all();
  129 |     if (allNumberInputs.length >= 2) {
  130 |       const cantIdx = allNumberInputs.length - 2;
  131 |       const precIdx = allNumberInputs.length - 1;
  132 |       await allNumberInputs[cantIdx].fill(String(cantidad));
  133 |       await allNumberInputs[precIdx].fill(String(precioUnitario));
  134 |     }
  135 |   }
  136 | 
  137 |   /** Save the current cotización. Returns true if save was attempted. */
  138 |   async save(): Promise<boolean> {
  139 |     if (await this.saveButton.isVisible().catch(() => false)) {
  140 |       const isDisabled = await this.saveButton.isDisabled().catch(() => false);
  141 |       if (!isDisabled) {
  142 |         await this.saveButton.click();
  143 |         await this.page.waitForTimeout(2000);
  144 |         return true;
  145 |       }
  146 |     }
  147 |     return false;
  148 |   }
  149 | 
  150 |   /** Convert the current cotización to a trabajo. */
  151 |   async convertToTrabajo() {
  152 |     await this.convertButton.click();
  153 |     await this.page.waitForTimeout(3000);
  154 |   }
  155 | 
  156 |   /** Get the displayed total amount. */
  157 |   async getTotal(): Promise<string> {
  158 |     const totalEl = this.page.locator('text=/\\$[\\d,.]+/').last();
  159 |     return this.getText(totalEl);
  160 |   }
  161 | 
```