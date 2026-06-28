# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scenarios/purchase-orders.spec.ts >> Purchase Orders >> create purchase order with proveedor
- Location: e2e/tests/scenarios/purchase-orders.spec.ts:24:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /guardar|crear/i })
    - locator resolved to <button disabled type="submit" class="inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-sm w-full">+ Crear Orden de Compra</button>
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
        - button "📋 Órdenes de Compra 4" [active] [ref=e31]:
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
          - heading "Órdenes de Compra" [level=2] [ref=e65]
          - paragraph [ref=e66]: Crea una OC para un proveedor. Al marcarla como 'recibida', el inventario se actualiza y pasa a Cuentas por Pagar.
        - generic [ref=e67]:
          - heading "Nueva Orden de Compra" [level=3] [ref=e68]
          - generic [ref=e69]:
            - generic [ref=e70]:
              - generic [ref=e71]:
                - generic [ref=e72]: Proveedor *
                - combobox [ref=e73]:
                  - option "Seleccionar proveedor..."
                  - option "AutoParts Mérida" [selected]
                  - option "Distribuidora del Sureste"
              - generic [ref=e74]:
                - generic [ref=e75]: Fecha
                - textbox [ref=e76]: 2026-06-28
              - generic [ref=e77]:
                - generic [ref=e78]: Nº Orden (opcional)
                - textbox "Ej. OC-2026-001" [ref=e79]
            - generic [ref=e80]:
              - generic [ref=e81]: Descripción (opcional)
              - textbox "Ej. Reposición mensual filtros" [ref=e82]
            - generic [ref=e83]:
              - generic [ref=e84]: Piezas a OrdenarEl inventario aumentará cuando marques la OC como recibida
              - generic [ref=e85]:
                - generic [ref=e86]:
                  - button "📦 Del inventario" [ref=e87]
                  - button "✨ Nueva refacción" [ref=e88]
                - generic [ref=e89]:
                  - generic [ref=e90]:
                    - generic [ref=e91]: Refacción
                    - combobox [ref=e92]:
                      - option "Seleccionar pieza..." [selected]
                      - option "Filtro de aceite (FLT-ACE-001)"
                      - option "Aceite 5W-30 1L (ACE-5W30-1L)"
                      - option "Disco de freno trasero (DSC-TRA-002)"
                      - option "Anticongelante 1L (ANTI-COOL-1)"
                      - option "Correa de distribución (COR-DIST-F1)"
                      - option "Filtro de combustible (FLT-COMB-03)"
                      - option "Aceite de transmisión 1L (ACE-TRANS-1)"
                      - option "Bujías (juego de 4) (BUJ-NGK-004)"
                      - option "Pastillas de freno del. (PAD-DEL-001)"
                      - option "Filtro de aire (FLT-AIR-002)"
                      - option "Vape de fresa"
                      - option "Filtro aceite (73828292)"
                      - option "Vape"
                      - option "pinguino"
                      - option "DoubleClick mqxcwd32u9al"
                      - option "NavDuring mqxcwi6mvi8k"
                      - option "Persist Test mqxcwtg2zdgr"
                      - option "Refacción E2E mqxcx44j51dt"
                      - option "Aceite E2E mqxd5ldb6h7e"
                      - option "Aceite E2E mqxd6d0o9jvc"
                      - option "Aceite E2E mqxd76cn3svh"
                      - option "Refacción E2E mqxd817jhtwo"
                      - option "Filtro E2E mqxd88usjv6m"
                      - option "Refacción E2E mqxd8hmo5m5a"
                      - option "Refacción E2E mqxdbxbq0edz"
                      - option "Refacción E2E mqxdcf7dnoji"
                      - option "Refacción E2E mqxdcxidelb1"
                      - option "Reset Test mqxdhjb91fbm"
                      - option "DoubleClick mqxdnk3hvuq8"
                      - option "NavDuring mqxdnpmhgk90"
                      - option "Persist Test mqxdo1hubjwi"
                      - option "Rapid mqxdp0i72bj2"
                      - option "Refacción E2E mqxdptr83crh"
                      - option "Aceite E2E mqxe3c6rt5yy"
                      - option "Aceite E2E mqxe43sqc9lh"
                      - option "Aceite E2E mqxe4x6eooi2"
                      - option "Refacción E2E mqxe5sdpymvp"
                      - option "Filtro E2E mqxe60799tfz"
                      - option "Refacción E2E mqxe692pbbzq"
                      - option "Aceite Bajo Stock mqxe6ehhf7c4"
                      - option "Aceite Bajo Stock mqxe6yajez2r"
                      - option "Aceite Bajo Stock mqxe7inqc2ys"
                      - option "Badge Test mqxe86z7xakp"
                      - option "Refacción E2E mqxelfmtmtst"
                      - option "Refacción E2E mqxelxi4lyg5"
                      - option "Refacción E2E mqxemfrdf39x"
                      - option "DoubleClick mqxhglav8hle"
                      - option "NavDuring mqxhgrbbyh2o"
                      - option "Persist Test mqxhh4mh0ivr"
                      - option "Rapid mqxhhyo8oyy0"
                      - option "Refacción E2E mqxhisithmue"
                      - option "DoubleClick mqxhmzphxm8a"
                      - option "NavDuring mqxhn5tnwhhd"
                      - option "Persist Test mqxhnj3r87ub"
                      - option "Rapid mqxhodhff4nf"
                      - option "Refacción E2E mqxhppmvvpd8"
                      - option "Válvula de presión Año 2024 — piñón"
                      - option "Válvula de presión Año 2024 — piñón"
                      - option "Aceite E2E mqxht22bob5e"
                      - option "Refacción de prueba con nombre extremadamente largo para verificar que la interfaz maneja correctamente textos extensos sin romper el layout ni causar overflow horizontal o vertical en las tarjetas de inventario del sistema"
                      - option "Aceite E2E mqxhtuofn3tc"
                      - option "🔧 Herramienta Premium 🛠️ mqxhud1v6co1"
                      - option "Sin Stock mqxhuiieewd5"
                      - option "Refacción E2E mqxhut7orcln"
                      - option "Sin Stock mqxhv05zlbzg"
                      - option "Filtro E2E mqxhv2ub0ovg"
                      - option "Refacción E2E mqxhvdmfwlk3"
                      - option "Parte Cara mqxhvi2ylicz"
                      - option "Aceite Bajo Stock mqxhvjyq77u6"
                      - option "Parte Cara mqxhvzvkicnq"
                      - option "Aceite Bajo Stock mqxhw4t5d57g"
                      - option "Badge Test mqxhwvhc30fo"
                      - option "Decimal Test mqxhxe7ltdcv"
                      - option "Decimal Test mqxhxvtmbg67"
                      - option "Aceite E2E mqxi60wcvgwd"
                      - option "Refacción E2E mqxi6o30vzov"
                      - option "Aceite E2E mqxi6tll8w25"
                      - option "Refacción E2E mqxi778m0gri"
                      - option "Refacción E2E mqxi7s8u5jxz"
                      - option "Filtro E2E mqxi823l0yok"
                      - option "Refacción E2E mqxi8d26zoxs"
                      - option "Aceite Bajo Stock mqxi8jgn9qda"
                      - option "Aceite Bajo Stock mqxi94a1hg6n"
                      - option "Reset Test mqxiaztb9fpn"
                      - option "Badge Test mqxib2i3fs1l"
                      - option "DoubleClick mqxiws6pbi6x"
                      - option "NavDuring mqxiwygmve0b"
                      - option "Persist Test mqxixc32bj8z"
                      - option "Rapid mqxiyisnqag8"
                      - option "Refacción E2E mqxizvfjjzgg"
                      - option "Válvula de presión Año 2024 — piñón"
                      - option "Refacción de prueba con nombre extremadamente largo para verificar que la interfaz maneja correctamente textos extensos sin romper el layout ni causar overflow horizontal o vertical en las tarjetas de inventario del sistema"
                      - option "🔧 Herramienta Premium 🛠️ mqxj48ryrupy"
                      - option "Sin Stock mqxj4eaer7bi"
                      - option "Parte Cara mqxj4vgh1xsk"
                      - option "Decimal Test mqxj5hakwruy"
                      - option "Aceite E2E mqxjcroed7l1"
                      - option "Aceite E2E mqxjdkoernus"
                      - option "Refacción E2E mqxjejw56qtk"
                      - option "Filtro E2E mqxjetvqagyg"
                      - option "Refacción E2E mqxjf4zol178"
                      - option "Aceite Bajo Stock mqxjfblp8h1e"
                      - option "Aceite Bajo Stock mqxjfwkmk2ws"
                      - option "Badge Test mqxjhewpyi3s"
                  - generic [ref=e93]:
                    - generic [ref=e94]: Cantidad
                    - spinbutton [ref=e95]: "1"
                  - generic [ref=e96]:
                    - generic [ref=e97]: Precio compra ($)
                    - spinbutton [ref=e98]
                - button "+ Agregar" [disabled] [ref=e100]
            - generic [ref=e101]:
              - generic [ref=e102]:
                - paragraph [ref=e103]: ¿La factura del proveedor incluye IVA?
                - paragraph [ref=e104]: No — el total no incluye IVA (precio de contado sin factura fiscal)
              - button [ref=e105]
            - paragraph [ref=e107]: ⚠️ Agrega al menos una pieza a la orden.
            - button "+ Crear Orden de Compra" [disabled] [ref=e108]
        - generic [ref=e109]:
          - generic [ref=e110]:
            - generic [ref=e111]: Proveedor
            - combobox [ref=e112]:
              - option "Todos los proveedores" [selected]
              - option "AutoParts Mérida"
              - option "Distribuidora del Sureste"
          - generic [ref=e113]:
            - button "Todos (4)" [ref=e114]
            - button "Pendientes de recibir (0)" [ref=e115]
            - button "Recibidas (4)" [ref=e116]
            - button "Canceladas (0)" [ref=e117]
        - generic [ref=e118]:
          - generic [ref=e120]:
            - generic [ref=e121]:
              - generic [ref=e122]:
                - generic [ref=e123]: 🏪 AutoParts Mérida
                - generic [ref=e124]: J 2637383
                - generic [ref=e125]: ✅ Recibida
              - generic [ref=e126]:
                - generic [ref=e127]: 26/6/2026
                - generic [ref=e128]: · 2 piezas
                - generic [ref=e129]:
                  - text: ·
                  - strong [ref=e130]: $440.00
                  - text: + IVA
                  - generic [ref=e131]: ($$70.40)
                  - text: =
                  - strong [ref=e132]: $510.40
                - generic [ref=e133]: IVA incluido
              - generic [ref=e134]: "Recibida: 26/6/2026"
            - generic [ref=e135]:
              - button "▼ Ver piezas" [ref=e136]
              - button "✏️ Corregir orden" [ref=e137]
          - generic [ref=e139]:
            - generic [ref=e140]:
              - generic [ref=e141]:
                - generic [ref=e142]: 🏪 Distribuidora del Sureste
                - generic [ref=e143]: OC-2026-003
                - generic [ref=e144]: ✅ Recibida
              - generic [ref=e145]:
                - generic [ref=e146]: 26/6/2026
                - generic [ref=e147]: · 2 piezas
                - generic [ref=e148]:
                  - text: ·
                  - strong [ref=e149]: $134,000.00
                  - text: + IVA
                  - generic [ref=e150]: ($$21,440.00)
                  - text: =
                  - strong [ref=e151]: $155,440.00
                - generic [ref=e152]: IVA incluido
              - generic [ref=e153]: "Recibida: 26/6/2026"
            - generic [ref=e154]:
              - button "▼ Ver piezas" [ref=e155]
              - button "✏️ Corregir orden" [ref=e156]
          - generic [ref=e158]:
            - generic [ref=e159]:
              - generic [ref=e160]:
                - generic [ref=e161]: 🏪 Distribuidora del Sureste
                - generic [ref=e162]: OC-2026-002
                - generic [ref=e163]: ✅ Recibida
              - generic [ref=e164]:
                - generic [ref=e165]: 15/6/2026
                - generic [ref=e166]: · Pastillas de freno y correas de distribución.
                - generic [ref=e167]: · 2 piezas
                - generic [ref=e168]:
                  - text: "· Total:"
                  - strong [ref=e169]: $2,020.00
              - generic [ref=e170]: "Recibida: 26/6/2026"
            - generic [ref=e171]:
              - button "▼ Ver piezas" [ref=e172]
              - button "✏️ Corregir orden" [ref=e173]
          - generic [ref=e175]:
            - generic [ref=e176]:
              - generic [ref=e177]:
                - generic [ref=e178]: 🏪 AutoParts Mérida
                - generic [ref=e179]: OC-2026-001
                - generic [ref=e180]: ✅ Recibida
              - generic [ref=e181]:
                - generic [ref=e182]: 7/6/2026
                - generic [ref=e183]: · Reabasto mensual de filtros y aceites.
                - generic [ref=e184]: · 3 piezas
                - generic [ref=e185]:
                  - text: "· Total:"
                  - strong [ref=e186]: $2,625.00
            - generic [ref=e187]:
              - button "▼ Ver piezas" [ref=e188]
              - button "✏️ Corregir orden" [ref=e189]
  - generic: ✓ 1 passed
```

# Test source

```ts
  9   |  */
  10  | export class OrdenesCompraPage extends BasePage {
  11  |   readonly sectionTitle: Locator;
  12  |   readonly crearOrdenButton: Locator;
  13  | 
  14  |   // ─── Form ──────────────────────────────────────────────────────────────────
  15  |   readonly proveedorSelect: Locator;
  16  |   readonly descripcionInput: Locator;
  17  |   readonly numeroOrdenInput: Locator;
  18  |   readonly conIVACheckbox: Locator;
  19  |   readonly addItemButton: Locator;
  20  |   readonly refaccionSelect: Locator;
  21  |   readonly cantidadInput: Locator;
  22  |   readonly precioInput: Locator;
  23  |   readonly saveButton: Locator;
  24  | 
  25  |   // ─── List ──────────────────────────────────────────────────────────────────
  26  |   readonly ordenesList: Locator;
  27  |   readonly filterSelect: Locator;
  28  | 
  29  |   // ─── Actions ───────────────────────────────────────────────────────────────
  30  |   readonly recibirButton: Locator;
  31  |   readonly editarButton: Locator;
  32  |   readonly eliminarButton: Locator;
  33  | 
  34  |   constructor(page: Page) {
  35  |     super(page);
  36  |     this.sectionTitle = page.locator('h2:has-text("Órdenes de Compra")');
  37  |     this.crearOrdenButton = page.getByRole('button', { name: /nueva orden|crear orden/i });
  38  | 
  39  |     this.proveedorSelect = page.locator('select:has(option:has-text("Proveedor"))').first();
  40  |     this.descripcionInput = page.locator('input[placeholder*="descripción" i], textarea').first();
  41  |     this.numeroOrdenInput = page.locator('input[placeholder*="número" i], input[placeholder*="orden" i]').first();
  42  |     this.conIVACheckbox = page.locator('input[type="checkbox"]').first();
  43  |     this.addItemButton = page.getByRole('button', { name: /agregar refacción|agregar item|añadir/i }).first();
  44  |     this.refaccionSelect = page.locator('select:has(option:has-text("Seleccionar refacción"))').first();
  45  |     this.cantidadInput = page.locator('input[type="number"][placeholder*="cant" i]').first();
  46  |     this.precioInput = page.locator('input[type="number"][placeholder*="precio" i]').first();
  47  |     this.saveButton = page.getByRole('button', { name: /guardar|crear/i });
  48  | 
  49  |     this.ordenesList = page.locator('.space-y-3, .divide-y').first();
  50  |     this.filterSelect = page.locator('select:has(option:has-text("Todas"))').first();
  51  | 
  52  |     this.recibirButton = page.getByRole('button', { name: /recibir|marcar recibida/i }).first();
  53  |     this.editarButton = page.getByRole('button', { name: /editar/i }).first();
  54  |     this.eliminarButton = page.getByRole('button', { name: /eliminar/i }).first();
  55  |   }
  56  | 
  57  |   async waitForPageLoad() {
  58  |     await this.sectionTitle.waitFor({ state: 'visible', timeout: 15_000 });
  59  |   }
  60  | 
  61  |   /** Select a proveedor for the new order. */
  62  |   async selectProveedor(index = 1) {
  63  |     if (await this.proveedorSelect.isVisible().catch(() => false)) {
  64  |       const count = await this.getOptionCount(this.proveedorSelect);
  65  |       if (count > 1) {
  66  |         await this.selectByIndex(this.proveedorSelect, Math.min(index, count - 1));
  67  |       }
  68  |     }
  69  |   }
  70  | 
  71  |   /** Fill the order description. */
  72  |   async fillDescription(text: string) {
  73  |     if (await this.descripcionInput.isVisible().catch(() => false)) {
  74  |       await this.fillInput(this.descripcionInput, text);
  75  |     }
  76  |   }
  77  | 
  78  |   /** Add an item from existing inventory. */
  79  |   async addItemFromInventory(refIndex = 1, cantidad = 1, precio = 100) {
  80  |     if (await this.addItemButton.isVisible().catch(() => false)) {
  81  |       await this.addItemButton.click();
  82  |       await this.page.waitForTimeout(500);
  83  |     }
  84  | 
  85  |     if (await this.refaccionSelect.isVisible().catch(() => false)) {
  86  |       const count = await this.getOptionCount(this.refaccionSelect);
  87  |       if (count > 1) {
  88  |         await this.selectByIndex(this.refaccionSelect, Math.min(refIndex, count - 1));
  89  |       }
  90  |     }
  91  | 
  92  |     if (await this.cantidadInput.isVisible().catch(() => false)) {
  93  |       await this.fillInput(this.cantidadInput, String(cantidad));
  94  |     }
  95  |     if (await this.precioInput.isVisible().catch(() => false)) {
  96  |       await this.fillInput(this.precioInput, String(precio));
  97  |     }
  98  |   }
  99  | 
  100 |   /** Toggle IVA checkbox. */
  101 |   async toggleIVA() {
  102 |     if (await this.conIVACheckbox.isVisible().catch(() => false)) {
  103 |       await this.conIVACheckbox.click();
  104 |     }
  105 |   }
  106 | 
  107 |   /** Save the order. */
  108 |   async save() {
> 109 |     await this.saveButton.click();
      |                           ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  110 |     await this.page.waitForTimeout(2000);
  111 |   }
  112 | 
  113 |   /** Mark an order as received. */
  114 |   async markAsReceived() {
  115 |     await this.recibirButton.click();
  116 |     await this.page.waitForTimeout(2000);
  117 |   }
  118 | 
  119 |   /** Click edit on the first order. */
  120 |   async clickEdit() {
  121 |     await this.editarButton.click();
  122 |     await this.page.waitForTimeout(1000);
  123 |   }
  124 | 
  125 |   /** Get the count of orders in the list. */
  126 |   async getOrderCount(): Promise<number> {
  127 |     const items = this.page.locator('.border.rounded-xl:has(text=/OC-|Orden/), [data-testid="orden-item"]');
  128 |     return items.count();
  129 |   }
  130 | 
  131 |   /** Get the status badge of the first order. */
  132 |   async getFirstOrderStatus(): Promise<string> {
  133 |     const badge = this.page.locator('.rounded-full, .badge').first();
  134 |     return this.getText(badge);
  135 |   }
  136 | 
  137 |   /** Check if proveedor is visible in the order list. */
  138 |   async isProveedorVisible(name: string): Promise<boolean> {
  139 |     return this.page.locator(`text=${name}`).first().isVisible().catch(() => false);
  140 |   }
  141 | }
  142 | 
```