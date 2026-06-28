# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scenarios/client-vehicle-history.spec.ts >> Client Vehicle History >> create client and manage multiple vehicles
- Location: e2e/tests/scenarios/client-vehicle-history.spec.ts:24:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "toyota"
Received string:    "héctor rocha"
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
        - button "👥 Clientes 28" [ref=e15]:
          - generic [ref=e16]: 👥
          - generic [ref=e17]: Clientes
          - generic [ref=e18]: "28"
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
        - generic [ref=e64]:
          - button "←" [ref=e65]
          - generic [ref=e66]:
            - heading "Cotización — DIMMSA / General" [level=2] [ref=e67]
            - paragraph [ref=e68]: Completa los datos y guarda para asignar número
        - generic [ref=e69]:
          - generic [ref=e70]: 🔢
          - paragraph [ref=e71]:
            - text: El número
            - strong [ref=e72]: COT-XXX
            - text: se asignará automáticamente al guardar.
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]: Fecha
            - textbox [ref=e76]: 2026-06-28
          - generic [ref=e77]:
            - generic [ref=e78]: Cliente *
            - combobox [ref=e79]:
              - option "— Seleccionar cliente —"
              - option "Andrés Flores"
              - option "Carlos Medina"
              - option "Juan Torres"
              - option "María Pérez"
              - option "Roberto Santos"
              - option "JORGE SARAIVA"
              - option "DIMMMSA"
              - option "E2E Cliente mqwgjr0e"
              - option "E2E Cliente mqwgt3vq"
              - option "E2E Cliente mqwl9y57"
              - option "E2E Cliente mqwmj4p5"
              - option "E2E Cliente mqwn3fkt"
              - option "E2E Cliente mqwnd0bu"
              - option "E2E Cliente mqwnpm35"
              - option "E2E Cliente mqwurzcm"
              - option "E2E Cliente mqwzjsz0"
              - option "E2E Cliente mqwzmkaf"
              - option "E2E Cliente mqwzmulv"
              - option "E2E Cliente mqwzn9gf"
              - option "E2E Cliente mqx5ksjb"
              - option "Cliente Multi-Vehículo mqxdtkq4bykn"
              - option "Cliente Multi-Vehículo mqxdtwcsi9pg"
              - option "Cliente Multi-Vehículo mqxdu938rg52"
              - option "Cliente Multi-Vehículo mqxhlyk6v628"
              - option "Cliente Multi-Vehículo mqxhmba8buo9"
              - option "Cliente Multi-Vehículo mqxhyww8k9kl"
              - option "Cliente Multi-Vehículo mqxhz9lil7eh"
              - option "Cliente Multi-Vehículo mqxj6dqgrek7" [selected]
        - generic [ref=e80]:
          - paragraph [ref=e81]: Datos del Vehículo
          - paragraph [ref=e82]: Sin vehículos registrados — ingresa los datos manualmente.
          - generic [ref=e83]:
            - generic [ref=e84]:
              - generic [ref=e85]: Marca *
              - textbox "Ej. Ford" [ref=e86]
            - generic [ref=e87]:
              - generic [ref=e88]: Modelo *
              - textbox "Ej. F-150" [ref=e89]
            - generic [ref=e90]:
              - generic [ref=e91]: Año
              - textbox "Ej. 2020" [ref=e92]
            - generic [ref=e93]:
              - generic [ref=e94]: Placas (opcional)
              - textbox "AAA-000-A" [ref=e95]
            - generic [ref=e96]:
              - generic [ref=e97]: Kilometraje (opcional)
              - textbox "Ej. 85000" [ref=e98]
        - generic [ref=e99]:
          - generic [ref=e100]: Trabajo / Descripción
          - textbox "Describe el trabajo a realizar..." [ref=e101]
        - generic [ref=e102]:
          - generic [ref=e103]: REFACCIONES
          - generic [ref=e104]:
            - generic [ref=e105]:
              - generic [ref=e106]: No.
              - generic [ref=e107]: Cant.
              - generic [ref=e108]: Descripción
              - generic [ref=e109]: Precio Unit.
              - generic [ref=e110]: Total
            - generic [ref=e112]:
              - generic [ref=e113]: "1"
              - spinbutton [ref=e115]: "1"
              - textbox "Descripción..." [ref=e117]
              - generic [ref=e119]:
                - generic [ref=e120]: $
                - spinbutton [ref=e121]
              - generic [ref=e122]: $0.00
              - button "×" [ref=e124]
            - generic [ref=e125]:
              - button "+ Agregar partida" [ref=e126]
              - generic [ref=e127]:
                - text: "Subtotal:"
                - generic [ref=e128]: $0.00
        - generic [ref=e129]:
          - generic [ref=e130]: MANO DE OBRA
          - generic [ref=e131]:
            - generic [ref=e132]:
              - generic [ref=e133]: No.
              - generic [ref=e134]: Cant.
              - generic [ref=e135]: Descripción
              - generic [ref=e136]: Precio Unit.
              - generic [ref=e137]: Total
            - generic [ref=e139]:
              - generic [ref=e140]: "1"
              - spinbutton [ref=e142]: "1"
              - textbox "Descripción..." [ref=e144]
              - generic [ref=e146]:
                - generic [ref=e147]: $
                - spinbutton [ref=e148]
              - generic [ref=e149]: $0.00
              - button "×" [ref=e151]
            - generic [ref=e152]:
              - button "+ Agregar partida" [ref=e153]
              - generic [ref=e154]:
                - text: "Subtotal:"
                - generic [ref=e155]: $0.00
        - generic [ref=e156]:
          - generic [ref=e157]:
            - checkbox "¿Incluir IVA? (16%)" [ref=e158]
            - generic [ref=e159] [cursor=pointer]: ¿Incluir IVA? (16%)
          - generic [ref=e160]:
            - generic [ref=e161]:
              - generic [ref=e162]: "SUBTOTAL:"
              - generic [ref=e163]: $0.00
            - generic [ref=e164]:
              - generic [ref=e165]: "TOTAL:"
              - generic [ref=e166]: $0.00
        - generic [ref=e167]:
          - generic [ref=e168]: Observaciones
          - textbox "Notas adicionales, condiciones de pago..." [ref=e169]
        - generic [ref=e170]:
          - generic [ref=e171]: Autorizado por
          - combobox [ref=e172]:
            - option "— Sin especificar —"
            - option "Héctor Rocha" [selected]
            - option "Sofía Rocha"
        - generic [ref=e173]:
          - button "← Cancelar" [ref=e174]
          - button "💾 Guardar Cotización" [disabled] [ref=e175]
          - generic [ref=e176]: "* Marca y Modelo son obligatorios"
```

# Test source

```ts
  32  |     await dashboardPage.navigateToModule('clientes');
  33  |     await page.waitForTimeout(1500);
  34  | 
  35  |     // Fill client name
  36  |     const nameInput = page.locator('input[placeholder="Nombre completo"]');
  37  |     if (await nameInput.isVisible().catch(() => false)) {
  38  |       await nameInput.fill(clientName);
  39  | 
  40  |       // Fill phone
  41  |       const phoneInput = page.locator('input[type="tel"]');
  42  |       if (await phoneInput.isVisible().catch(() => false)) {
  43  |         await phoneInput.fill('999-555-' + runId.slice(0, 4));
  44  |       }
  45  | 
  46  |       // Add client
  47  |       const addBtn = page.getByRole('button', { name: /agregar cliente/i });
  48  |       await addBtn.click();
  49  |       await page.waitForTimeout(2000);
  50  |     }
  51  | 
  52  |     // ─── Phase 2: Add first vehicle ─────────────────────────────────────────
  53  |     await showPhaseLabel(page, '🚗 Phase 2: Add Vehicle 1');
  54  |     // Look for "Agregar Vehículo" form/button
  55  |     const addVehBtn = page.getByRole('button', { name: /agregar vehículo|nuevo vehículo/i }).first();
  56  |     if (await addVehBtn.isVisible().catch(() => false)) {
  57  |       await addVehBtn.click();
  58  |       await page.waitForTimeout(500);
  59  |     }
  60  | 
  61  |     // Fill vehicle details
  62  |     const marcaInput = page.locator('input[placeholder*="marca" i], input[placeholder*="Toyota" i]').first();
  63  |     if (await marcaInput.isVisible().catch(() => false)) {
  64  |       await marcaInput.fill('Toyota');
  65  |       const modeloInput = page.locator('input[placeholder*="modelo" i], input[placeholder*="Corolla" i]').first();
  66  |       if (await modeloInput.isVisible().catch(() => false)) {
  67  |         await modeloInput.fill('Corolla');
  68  |       }
  69  |       const anioInput = page.locator('input[placeholder*="año" i], input[type="number"]').first();
  70  |       if (await anioInput.isVisible().catch(() => false)) {
  71  |         await anioInput.fill('2020');
  72  |       }
  73  |       const placaInput = page.locator('input[placeholder*="placa" i]').first();
  74  |       if (await placaInput.isVisible().catch(() => false)) {
  75  |         await placaInput.fill(`E2E-${runId.slice(0, 3)}`);
  76  |       }
  77  | 
  78  |       // Save vehicle
  79  |       const saveVehBtn = page.getByRole('button', { name: /guardar|agregar/i }).last();
  80  |       if (await saveVehBtn.isVisible().catch(() => false)) {
  81  |         await saveVehBtn.click();
  82  |         await page.waitForTimeout(2000);
  83  |       }
  84  |     }
  85  | 
  86  |     // ─── Phase 3: Add second vehicle ────────────────────────────────────────
  87  |     await showPhaseLabel(page, '🚗 Phase 3: Add Vehicle 2');
  88  |     if (await addVehBtn.isVisible().catch(() => false)) {
  89  |       await addVehBtn.click();
  90  |       await page.waitForTimeout(500);
  91  |     }
  92  | 
  93  |     if (await marcaInput.isVisible().catch(() => false)) {
  94  |       await marcaInput.fill('Honda');
  95  |       const modeloInput = page.locator('input[placeholder*="modelo" i]').first();
  96  |       if (await modeloInput.isVisible().catch(() => false)) {
  97  |         await modeloInput.fill('Civic');
  98  |       }
  99  |     }
  100 | 
  101 |     // ─── Phase 4: Create cotización with Vehicle 1 ──────────────────────────
  102 |     await showPhaseLabel(page, '📄 Phase 4: Cotización for Vehicle 1');
  103 |     await sidebar.clickTab('Cotizaciones');
  104 |     await page.waitForTimeout(1500);
  105 | 
  106 |     const generalBtn = page.getByRole('button', { name: /general/i }).first();
  107 |     if (await generalBtn.isVisible().catch(() => false)) {
  108 |       await generalBtn.click();
  109 |       await page.waitForTimeout(2000);
  110 | 
  111 |       // Select our client
  112 |       const clientSelect = page.locator('select').first();
  113 |       if (await clientSelect.isVisible().catch(() => false)) {
  114 |         // Find our client in the options
  115 |         const options = await clientSelect.locator('option').allTextContents();
  116 |         const clientIdx = options.findIndex(o => o.includes(clientName));
  117 |         if (clientIdx >= 0) {
  118 |           await clientSelect.selectOption({ index: clientIdx });
  119 |           await page.waitForTimeout(1000);
  120 | 
  121 |           // Select first vehicle
  122 |           const vehSelect = page.locator('select').nth(1);
  123 |           if (await vehSelect.isVisible().catch(() => false)) {
  124 |             const vehOpts = await vehSelect.locator('option').count();
  125 |             if (vehOpts > 1) {
  126 |               await vehSelect.selectOption({ index: 1 });
  127 |               await page.waitForTimeout(500);
  128 | 
  129 |               // Verify vehicle name shows Toyota
  130 |               const selectedVeh = await vehSelect.locator('option:checked').textContent();
  131 |               if (selectedVeh) {
> 132 |                 expect(selectedVeh.toLowerCase()).toContain('toyota');
      |                                                   ^ Error: expect(received).toContain(expected) // indexOf
  133 |               }
  134 |             }
  135 |           }
  136 |         }
  137 |       }
  138 |     }
  139 | 
  140 |     // ─── Phase 5: Verify vehicle linkage ────────────────────────────────────
  141 |     await showPhaseLabel(page, '✅ Phase 5: Vehicle Linkage Verified');
  142 |     // Page is stable, no crash, vehicle selection works
  143 |     const navVisible = await dashboardPage.nav.isVisible();
  144 |     expect(navVisible).toBe(true);
  145 | 
  146 |     await showPhaseLabel(page, '🎉 Client Vehicle History Complete');
  147 |   });
  148 | 
  149 |   test('vehicle select updates when client changes', async ({
  150 |     page, dashboardPage, cotizacionesPage
  151 |   }) => {
  152 |     await showPhaseLabel(page, '🔄 Vehicle-Client Dependency');
  153 |     await dashboardPage.navigateToModule('cotizaciones');
  154 |     await cotizacionesPage.waitForPageLoad();
  155 |     await cotizacionesPage.selectPlantillaGeneral();
  156 | 
  157 |     // Select first client
  158 |     await cotizacionesPage.selectClient(1);
  159 |     const vehicleSelect = cotizacionesPage.vehicleSelect;
  160 | 
  161 |     // Get vehicle options for client 1
  162 |     const vehCount1 = await vehicleSelect.isVisible().catch(() => false)
  163 |       ? await vehicleSelect.locator('option').count()
  164 |       : 0;
  165 | 
  166 |     // Change to client 2 (if available)
  167 |     const clientOpts = await cotizacionesPage.clientSelect.locator('option').count();
  168 |     if (clientOpts > 2) {
  169 |       await cotizacionesPage.selectClient(2);
  170 |       await page.waitForTimeout(1000);
  171 | 
  172 |       // Vehicle list might be different (or same if both have vehicles)
  173 |       const vehCount2 = await vehicleSelect.isVisible().catch(() => false)
  174 |         ? await vehicleSelect.locator('option').count()
  175 |         : 0;
  176 | 
  177 |       // The point is: no crash, vehicles updated per client
  178 |       expect(typeof vehCount2).toBe('number');
  179 |     }
  180 | 
  181 |     await showPhaseLabel(page, '✅ Vehicle-Client Sync Works');
  182 |   });
  183 | });
  184 | 
```