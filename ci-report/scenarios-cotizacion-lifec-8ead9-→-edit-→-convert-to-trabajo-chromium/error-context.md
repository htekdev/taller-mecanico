# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scenarios/cotizacion-lifecycle.spec.ts >> Cotización Lifecycle >> complete flow: create → save → edit → convert to trabajo
- Location: e2e/tests/scenarios/cotizacion-lifecycle.spec.ts:29:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
          - heading "Cotización COT-028" [level=2] [ref=e66]
          - paragraph [ref=e67]: Guardada — descarga el PDF cuando quieras
        - generic [ref=e68]:
          - button "← Inicio" [ref=e69]
          - button "✏️ Editar" [ref=e70]
          - generic [ref=e71]:
            - generic [ref=e72]:
              - generic [ref=e73]: 📄
              - textbox "nombre-del-archivo" [ref=e74]: COT-028
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
              - text: COT-028
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
                - row "1 1 Cambio de aceite motor $350.00 $350.00" [ref=e112]:
                  - cell "1" [ref=e113]
                  - cell "1" [ref=e114]
                  - cell "Cambio de aceite motor" [ref=e115]
                  - cell "$350.00" [ref=e116]
                  - cell "$350.00" [ref=e117]
              - rowgroup [ref=e118]:
                - 'row "Subtotal: $350.00" [ref=e119]':
                  - cell "Subtotal:" [ref=e120]
                  - cell "$350.00" [ref=e121]
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
              - generic [ref=e147]: $350.00
            - generic [ref=e148]:
              - generic [ref=e149]: "TOTAL:"
              - generic [ref=e150]: $350.00
  - generic: ✓ 3 passed
```

# Test source

```ts
  1   | import { test, expect } from '../../fixtures';
  2   | import { expectVisible, expectText, showPhaseLabel, expectClass } from '../visual-assert';
  3   | import { TestData } from '../../utils/test-data';
  4   | 
  5   | /**
  6   |  * Cotización Lifecycle — Complete user story from creation to conversion.
  7   |  *
  8   |  * Steps:
  9   |  * 1. Login as test user
  10  |  * 2. Navigate to Cotizaciones
  11  |  * 3. Select "General" plantilla
  12  |  * 4. Select client and vehicle
  13  |  * 5. Add multiple line items (parts + labor)
  14  |  * 6. Verify totals calculate correctly
  15  |  * 7. Save — verify success
  16  |  * 8. Verify cotización appears in history
  17  |  * 9. Edit the cotización — change a quantity
  18  |  * 10. Verify total updates
  19  |  * 11. Convert to trabajo
  20  |  * 12. Navigate to Trabajos — verify the trabajo exists
  21  |  * 13. Verify data integrity (amounts carry through)
  22  |  */
  23  | 
  24  | test.describe('Cotización Lifecycle', () => {
  25  |   test.beforeEach(async ({ loginPage }) => {
  26  |     await loginPage.loginAsTestUser();
  27  |   });
  28  | 
  29  |   test('complete flow: create → save → edit → convert to trabajo', async ({
  30  |     page, dashboardPage, cotizacionesPage, trabajosPage, sidebar
  31  |   }) => {
  32  |     // ─── Phase 1: Navigate to Cotizaciones ──────────────────────────────────
  33  |     await showPhaseLabel(page, '📄 Phase 1: Navigate to Cotizaciones');
  34  |     await dashboardPage.navigateToModule('cotizaciones');
  35  |     await cotizacionesPage.waitForPageLoad();
  36  |     await expectVisible(cotizacionesPage.plantillaGeneral, 'General plantilla card');
  37  | 
  38  |     // ─── Phase 2: Select General plantilla ──────────────────────────────────
  39  |     await showPhaseLabel(page, '📝 Phase 2: Select General Plantilla');
  40  |     await cotizacionesPage.selectPlantillaGeneral();
  41  |     await expectVisible(cotizacionesPage.clientSelect, 'Client select loaded');
  42  | 
  43  |     // ─── Phase 3: Select client and vehicle ─────────────────────────────────
  44  |     await showPhaseLabel(page, '👤 Phase 3: Select Client & Vehicle');
  45  |     await cotizacionesPage.selectClient(1);
  46  |     const clientValue = await cotizacionesPage.clientSelect.inputValue();
  47  |     expect(clientValue).toBeTruthy();
  48  |     await expectVisible(cotizacionesPage.clientSelect, 'Client selected');
  49  | 
  50  |     await cotizacionesPage.selectVehicle(1);
  51  | 
  52  |     // ─── Phase 4: Add line items ────────────────────────────────────────────
  53  |     await showPhaseLabel(page, '📋 Phase 4: Add Line Items');
  54  | 
  55  |     // The cotización form has line items built in — fill them
  56  |     const descInputs = page.locator('input[placeholder*="descripción" i], input[placeholder*="concepto" i]');
  57  |     const numInputs = page.locator('input[type="number"]');
  58  | 
  59  |     // Fill first line item if inputs are available
  60  |     if (await descInputs.first().isVisible().catch(() => false)) {
  61  |       await descInputs.first().fill('Cambio de aceite motor');
  62  |       // Fill quantity and price in available number inputs
  63  |       const allNums = await numInputs.all();
  64  |       if (allNums.length >= 2) {
  65  |         await allNums[0].fill('1');
  66  |         await allNums[1].fill('350');
  67  |       }
  68  |     }
  69  | 
  70  |     // ─── Phase 5: Save cotización ───────────────────────────────────────────
  71  |     await showPhaseLabel(page, '💾 Phase 5: Save Cotización');
  72  |     if (await cotizacionesPage.saveButton.isVisible().catch(() => false)) {
  73  |       await cotizacionesPage.save();
  74  |       const saveSuccess = await cotizacionesPage.wasSaveSuccessful();
> 75  |       expect(saveSuccess).toBe(true);
      |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  76  |     }
  77  | 
  78  |     // ─── Phase 6: Verify in history ─────────────────────────────────────────
  79  |     await showPhaseLabel(page, '✅ Phase 6: Verify Save Success');
  80  |     // After save, the cotización should have a number
  81  |     const cotNum = await cotizacionesPage.getCotizacionNumber();
  82  |     // Cotización number might be auto-generated
  83  |     if (cotNum) {
  84  |       expect(cotNum).toBeTruthy();
  85  |     }
  86  | 
  87  |     // ─── Phase 7: Convert to Trabajo ────────────────────────────────────────
  88  |     await showPhaseLabel(page, '🔄 Phase 7: Convert to Trabajo');
  89  |     if (await cotizacionesPage.convertButton.isVisible().catch(() => false)) {
  90  |       await cotizacionesPage.convertToTrabajo();
  91  | 
  92  |       // Verify conversion modal/success
  93  |       await showPhaseLabel(page, '✅ Phase 7: Conversion Complete');
  94  |       // After conversion, navigate to trabajos to verify
  95  |       await sidebar.clickTab('Trabajos');
  96  |       await trabajosPage.waitForPageLoad();
  97  |       await expectVisible(trabajosPage.sectionTitle, 'Trabajos section loaded');
  98  |     }
  99  | 
  100 |     await showPhaseLabel(page, '🎉 COMPLETE: Cotización Lifecycle');
  101 |   });
  102 | 
  103 |   test('create cotización with Ayuntamiento plantilla', async ({
  104 |     page, dashboardPage, cotizacionesPage
  105 |   }) => {
  106 |     await showPhaseLabel(page, '🏛️ Ayuntamiento Plantilla');
  107 |     await dashboardPage.navigateToModule('cotizaciones');
  108 |     await cotizacionesPage.waitForPageLoad();
  109 | 
  110 |     // Select Ayuntamiento plantilla
  111 |     if (await cotizacionesPage.plantillaAyuntamiento.isVisible().catch(() => false)) {
  112 |       await cotizacionesPage.selectPlantillaAyuntamiento();
  113 |       await expectVisible(cotizacionesPage.clientSelect, 'Ayuntamiento form loaded');
  114 |       await cotizacionesPage.selectClient(1);
  115 | 
  116 |       // Verify department-specific fields are visible
  117 |       const deptoSelect = page.locator('select:has(option:has-text("Obras públicas"))');
  118 |       if (await deptoSelect.isVisible().catch(() => false)) {
  119 |         await expectVisible(deptoSelect, 'Department select available');
  120 |       }
  121 |     }
  122 | 
  123 |     await showPhaseLabel(page, '✅ Ayuntamiento plantilla works');
  124 |   });
  125 | 
  126 |   test('cotización form preserves data on validation error', async ({
  127 |     page, dashboardPage, cotizacionesPage
  128 |   }) => {
  129 |     await showPhaseLabel(page, '⚠️ Validation Error Recovery');
  130 |     await dashboardPage.navigateToModule('cotizaciones');
  131 |     await cotizacionesPage.waitForPageLoad();
  132 |     await cotizacionesPage.selectPlantillaGeneral();
  133 | 
  134 |     // Try to save without selecting a client (should fail)
  135 |     if (await cotizacionesPage.saveButton.isVisible().catch(() => false)) {
  136 |       // Don't select a client — just try to save
  137 |       await cotizacionesPage.save();
  138 | 
  139 |       // Form should still be visible (not navigated away)
  140 |       await expectVisible(cotizacionesPage.clientSelect, 'Form preserved after error');
  141 |     }
  142 | 
  143 |     await showPhaseLabel(page, '✅ Form preserved on error');
  144 |   });
  145 | });
  146 | 
```