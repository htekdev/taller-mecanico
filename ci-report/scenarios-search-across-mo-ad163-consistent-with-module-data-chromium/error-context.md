# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scenarios/search-across-modules.spec.ts >> Search Across Modules >> sidebar badge counts are consistent with module data
- Location: e2e/tests/scenarios/search-across-modules.spec.ts:75:7

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    7
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
        - button "🔧 Trabajos 🕐 7" [active] [ref=e23]:
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
          - heading "Registro de Trabajos" [level=2] [ref=e65]
          - paragraph [ref=e66]: Selecciona cliente, unidad y las refacciones usadas del inventario.
        - generic [ref=e67]:
          - button "👥 General" [ref=e68]
          - button "🏛️ Ayuntamiento" [ref=e69]
        - generic [ref=e70]:
          - heading "Nuevo Trabajo" [level=3] [ref=e72]
          - generic [ref=e73]:
            - generic [ref=e74]:
              - generic [ref=e75]:
                - generic [ref=e76]: ① Cliente
                - combobox [ref=e77]:
                  - option "Seleccionar cliente..." [selected]
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
                  - option "Cliente Multi-Vehículo mqxj6dqgrek7"
                  - option "Cliente Multi-Vehículo mqxj6qn8xe4c"
              - generic [ref=e78]:
                - generic [ref=e79]: ② Unidad / Vehículo
                - combobox [disabled] [ref=e80]:
                  - option "Seleccionar unidad..." [selected]
            - generic [ref=e81]:
              - generic [ref=e82]:
                - generic [ref=e83]: Fecha
                - textbox [ref=e84]: 2026-06-28
              - generic [ref=e85]:
                - generic [ref=e86]: Número de Orden
                - textbox "Ej. 001, OT-2026-45..." [ref=e87]
              - generic [ref=e88]:
                - generic [ref=e89]: 🛣 Kilometraje
                - spinbutton [ref=e90]
              - generic [ref=e91]:
                - generic [ref=e92]: Descripción general del trabajo
                - textbox "Ej. Servicio completo frenos y aceite..." [ref=e93]
            - generic [ref=e94]:
              - generic [ref=e95]: ② Mano de ObraAgrega cada tarea con su precio
              - generic [ref=e96]:
                - generic [ref=e97]:
                  - generic [ref=e98]:
                    - generic [ref=e99]: Concepto
                    - textbox "Ej. Arreglo de frenos, engrase de pernos..." [ref=e100]
                  - generic [ref=e101]:
                    - generic [ref=e102]: Precio ($)
                    - spinbutton [ref=e103]
                  - button "+ Agregar" [disabled] [ref=e105]
                - paragraph [ref=e106]: Sin conceptos de mano de obra. El trabajo se registra con mano de obra = $0.00
            - generic [ref=e107]:
              - generic [ref=e108]:
                - generic [ref=e109]: 🏭 Servicios ExternosLab. inyectores, rectificación, etc.
                - button "+ Agregar" [ref=e110]
              - paragraph [ref=e112]: Sin servicios externos. Toca "+ Agregar" para registrar laboratorio, rectificación, etc.
            - generic [ref=e113]:
              - generic [ref=e115]: ③ Refacciones del Inventario
              - generic [ref=e116]:
                - generic [ref=e117]:
                  - generic [ref=e118]:
                    - generic [ref=e119]: Refacción
                    - combobox [ref=e120]:
                      - option "Seleccionar pieza..." [selected]
                      - option "Filtro de aceite (FLT-ACE-001) — 8 pieza en stock"
                      - option "Disco de freno trasero (DSC-TRA-002) — 2 pieza en stock"
                      - option "Anticongelante 1L (ANTI-COOL-1) — 12 litro en stock"
                      - option "Correa de distribución (COR-DIST-F1) — 2 pieza en stock"
                      - option "Filtro de combustible (FLT-COMB-03) — 2 pieza en stock"
                      - option "Aceite de transmisión 1L (ACE-TRANS-1) — 10 litro en stock"
                      - option "Bujías (juego de 4) (BUJ-NGK-004) — 6 juego en stock"
                      - option "Pastillas de freno del. (PAD-DEL-001) — 4 juego en stock"
                      - option "Filtro de aire (FLT-AIR-002) — 5 pieza en stock"
                      - option "Vape de fresa — 1 pza en stock"
                      - option "Filtro aceite (73828292) — 1 pza en stock"
                      - option "Vape — 200 lt en stock"
                      - option "pinguino — 1 pza en stock"
                      - option "DoubleClick mqxcwd32u9al — 0 pza en stock"
                      - option "NavDuring mqxcwi6mvi8k — 0 pza en stock"
                      - option "Persist Test mqxcwtg2zdgr — 7 pza en stock"
                      - option "Refacción E2E mqxcx44j51dt — 5 pza en stock"
                      - option "Aceite E2E mqxd5ldb6h7e — 10 pza en stock"
                      - option "Aceite E2E mqxd6d0o9jvc — 10 pza en stock"
                      - option "Aceite E2E mqxd76cn3svh — 10 pza en stock"
                      - option "Refacción E2E mqxd817jhtwo — 16 pza en stock"
                      - option "Filtro E2E mqxd88usjv6m — 5 pza en stock"
                      - option "Refacción E2E mqxd8hmo5m5a — 10 pza en stock"
                      - option "Refacción E2E mqxdbxbq0edz — 7 pza en stock"
                      - option "Refacción E2E mqxdcf7dnoji — 18 pza en stock"
                      - option "Refacción E2E mqxdcxidelb1 — 12 pza en stock"
                      - option "Reset Test mqxdhjb91fbm — 5 pza en stock"
                      - option "DoubleClick mqxdnk3hvuq8 — 0 pza en stock"
                      - option "NavDuring mqxdnpmhgk90 — 0 pza en stock"
                      - option "Persist Test mqxdo1hubjwi — 7 pza en stock"
                      - option "Rapid mqxdp0i72bj2 — 0 pza en stock"
                      - option "Refacción E2E mqxdptr83crh — 5 pza en stock"
                      - option "Aceite E2E mqxe3c6rt5yy — 10 pza en stock"
                      - option "Aceite E2E mqxe43sqc9lh — 10 pza en stock"
                      - option "Aceite E2E mqxe4x6eooi2 — 10 pza en stock"
                      - option "Refacción E2E mqxe5sdpymvp — 9 pza en stock"
                      - option "Filtro E2E mqxe60799tfz — 5 pza en stock"
                      - option "Refacción E2E mqxe692pbbzq — 10 pza en stock"
                      - option "Aceite Bajo Stock mqxe6ehhf7c4 — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxe6yajez2r — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxe7inqc2ys — 1 pza en stock"
                      - option "Badge Test mqxe86z7xakp — 5 pza en stock"
                      - option "Refacción E2E mqxelfmtmtst — 19 pza en stock"
                      - option "Refacción E2E mqxelxi4lyg5 — 10 pza en stock"
                      - option "Refacción E2E mqxemfrdf39x — 9 pza en stock"
                      - option "DoubleClick mqxhglav8hle — 0 pza en stock"
                      - option "NavDuring mqxhgrbbyh2o — 0 pza en stock"
                      - option "Persist Test mqxhh4mh0ivr — 7 pza en stock"
                      - option "Rapid mqxhhyo8oyy0 — 0 pza en stock"
                      - option "Refacción E2E mqxhisithmue — 5 pza en stock"
                      - option "DoubleClick mqxhmzphxm8a — 0 pza en stock"
                      - option "NavDuring mqxhn5tnwhhd — 0 pza en stock"
                      - option "Persist Test mqxhnj3r87ub — 7 pza en stock"
                      - option "Rapid mqxhodhff4nf — 0 pza en stock"
                      - option "Refacción E2E mqxhppmvvpd8 — 5 pza en stock"
                      - option "Válvula de presión Año 2024 — piñón — 3 pza en stock"
                      - option "Válvula de presión Año 2024 — piñón — 3 pza en stock"
                      - option "Aceite E2E mqxht22bob5e — 10 pza en stock"
                      - option "Refacción de prueba con nombre extremadamente largo para verificar que la interfaz maneja correctamente textos extensos sin romper el layout ni causar overflow horizontal o vertical en las tarjetas de inventario del sistema — 1 pza en stock"
                      - option "Aceite E2E mqxhtuofn3tc — 10 pza en stock"
                      - option "Sin Stock mqxhuiieewd5 — 0 pza en stock"
                      - option "Refacción E2E mqxhut7orcln — 11 pza en stock"
                      - option "Sin Stock mqxhv05zlbzg — 0 pza en stock"
                      - option "Filtro E2E mqxhv2ub0ovg — 5 pza en stock"
                      - option "Refacción E2E mqxhvdmfwlk3 — 10 pza en stock"
                      - option "Parte Cara mqxhvi2ylicz — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxhvjyq77u6 — 1 pza en stock"
                      - option "Parte Cara mqxhvzvkicnq — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxhw4t5d57g — 1 pza en stock"
                      - option "Badge Test mqxhwvhc30fo — 5 pza en stock"
                      - option "Decimal Test mqxhxe7ltdcv — 3 pza en stock"
                      - option "Decimal Test mqxhxvtmbg67 — 3 pza en stock"
                      - option "Aceite E2E mqxi60wcvgwd — 10 pza en stock"
                      - option "Refacción E2E mqxi6o30vzov — 1 pza en stock"
                      - option "Aceite E2E mqxi6tll8w25 — 10 pza en stock"
                      - option "Refacción E2E mqxi778m0gri — 9 pza en stock"
                      - option "Refacción E2E mqxi7s8u5jxz — 11 pza en stock"
                      - option "Filtro E2E mqxi823l0yok — 5 pza en stock"
                      - option "Refacción E2E mqxi8d26zoxs — 10 pza en stock"
                      - option "Aceite Bajo Stock mqxi8jgn9qda — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxi94a1hg6n — 1 pza en stock"
                      - option "Reset Test mqxiaztb9fpn — 5 pza en stock"
                      - option "Badge Test mqxib2i3fs1l — 5 pza en stock"
                      - option "DoubleClick mqxiws6pbi6x — 0 pza en stock"
                      - option "NavDuring mqxiwygmve0b — 0 pza en stock"
                      - option "Persist Test mqxixc32bj8z — 7 pza en stock"
                      - option "Rapid mqxiyisnqag8 — 0 pza en stock"
                      - option "Refacción E2E mqxizvfjjzgg — 5 pza en stock"
                      - option "Válvula de presión Año 2024 — piñón — 3 pza en stock"
                      - option "Refacción de prueba con nombre extremadamente largo para verificar que la interfaz maneja correctamente textos extensos sin romper el layout ni causar overflow horizontal o vertical en las tarjetas de inventario del sistema — 1 pza en stock"
                      - option "🔧 Herramienta Premium 🛠️ mqxj48ryrupy — 2 pza en stock"
                      - option "Sin Stock mqxj4eaer7bi — 0 pza en stock"
                      - option "Parte Cara mqxj4vgh1xsk — 1 pza en stock"
                      - option "Decimal Test mqxj5hakwruy — 3 pza en stock"
                      - option "Aceite E2E mqxjcroed7l1 — 10 pza en stock"
                      - option "Aceite E2E mqxjdkoernus — 10 pza en stock"
                      - option "Refacción E2E mqxjejw56qtk — 18 pza en stock"
                      - option "Filtro E2E mqxjetvqagyg — 5 pza en stock"
                      - option "Refacción E2E mqxjf4zol178 — 10 pza en stock"
                      - option "Aceite Bajo Stock mqxjfblp8h1e — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxjfwkmk2ws — 1 pza en stock"
                      - option "Badge Test mqxjhewpyi3s — 5 pza en stock"
                      - option "Filtro de aceite (FLT-ACE-001) — 8 pieza en stock"
                      - option "Aceite 5W-30 1L (ACE-5W30-1L) — 20 litro en stock"
                      - option "Disco de freno trasero (DSC-TRA-002) — 2 pieza en stock"
                      - option "Anticongelante 1L (ANTI-COOL-1) — 12 litro en stock"
                      - option "Correa de distribución (COR-DIST-F1) — 2 pieza en stock"
                      - option "Filtro de combustible (FLT-COMB-03) — 2 pieza en stock"
                      - option "Aceite de transmisión 1L (ACE-TRANS-1) — 10 litro en stock"
                      - option "Bujías (juego de 4) (BUJ-NGK-004) — 6 juego en stock"
                      - option "Pastillas de freno del. (PAD-DEL-001) — 4 juego en stock"
                      - option "Filtro de aire (FLT-AIR-002) — 5 pieza en stock"
                      - option "Vape de fresa — 1 pza en stock"
                      - option "Filtro aceite (73828292) — 1 pza en stock"
                      - option "Vape — 200 lt en stock"
                      - option "pinguino — 1 pza en stock"
                      - option "DoubleClick mqxcwd32u9al — 0 pza en stock"
                      - option "NavDuring mqxcwi6mvi8k — 0 pza en stock"
                      - option "Persist Test mqxcwtg2zdgr — 7 pza en stock"
                      - option "Refacción E2E mqxcx44j51dt — 5 pza en stock"
                      - option "Aceite E2E mqxd5ldb6h7e — 10 pza en stock"
                      - option "Aceite E2E mqxd6d0o9jvc — 10 pza en stock"
                      - option "Aceite E2E mqxd76cn3svh — 10 pza en stock"
                      - option "Refacción E2E mqxd817jhtwo — 16 pza en stock"
                      - option "Filtro E2E mqxd88usjv6m — 5 pza en stock"
                      - option "Refacción E2E mqxd8hmo5m5a — 10 pza en stock"
                      - option "Refacción E2E mqxdbxbq0edz — 7 pza en stock"
                      - option "Refacción E2E mqxdcf7dnoji — 18 pza en stock"
                      - option "Refacción E2E mqxdcxidelb1 — 12 pza en stock"
                      - option "Reset Test mqxdhjb91fbm — 5 pza en stock"
                      - option "DoubleClick mqxdnk3hvuq8 — 0 pza en stock"
                      - option "NavDuring mqxdnpmhgk90 — 0 pza en stock"
                      - option "Persist Test mqxdo1hubjwi — 7 pza en stock"
                      - option "Rapid mqxdp0i72bj2 — 0 pza en stock"
                      - option "Refacción E2E mqxdptr83crh — 5 pza en stock"
                      - option "Aceite E2E mqxe3c6rt5yy — 10 pza en stock"
                      - option "Aceite E2E mqxe43sqc9lh — 10 pza en stock"
                      - option "Aceite E2E mqxe4x6eooi2 — 10 pza en stock"
                      - option "Refacción E2E mqxe5sdpymvp — 9 pza en stock"
                      - option "Filtro E2E mqxe60799tfz — 5 pza en stock"
                      - option "Refacción E2E mqxe692pbbzq — 10 pza en stock"
                      - option "Aceite Bajo Stock mqxe6ehhf7c4 — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxe6yajez2r — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxe7inqc2ys — 1 pza en stock"
                      - option "Badge Test mqxe86z7xakp — 5 pza en stock"
                      - option "Refacción E2E mqxelfmtmtst — 19 pza en stock"
                      - option "Refacción E2E mqxelxi4lyg5 — 10 pza en stock"
                      - option "Refacción E2E mqxemfrdf39x — 9 pza en stock"
                      - option "DoubleClick mqxhglav8hle — 0 pza en stock"
                      - option "NavDuring mqxhgrbbyh2o — 0 pza en stock"
                      - option "Persist Test mqxhh4mh0ivr — 7 pza en stock"
                      - option "Rapid mqxhhyo8oyy0 — 0 pza en stock"
                      - option "Refacción E2E mqxhisithmue — 5 pza en stock"
                      - option "DoubleClick mqxhmzphxm8a — 0 pza en stock"
                      - option "NavDuring mqxhn5tnwhhd — 0 pza en stock"
                      - option "Persist Test mqxhnj3r87ub — 7 pza en stock"
                      - option "Rapid mqxhodhff4nf — 0 pza en stock"
                      - option "Refacción E2E mqxhppmvvpd8 — 5 pza en stock"
                      - option "Válvula de presión Año 2024 — piñón — 3 pza en stock"
                      - option "Válvula de presión Año 2024 — piñón — 3 pza en stock"
                      - option "Aceite E2E mqxht22bob5e — 10 pza en stock"
                      - option "Refacción de prueba con nombre extremadamente largo para verificar que la interfaz maneja correctamente textos extensos sin romper el layout ni causar overflow horizontal o vertical en las tarjetas de inventario del sistema — 1 pza en stock"
                      - option "Aceite E2E mqxhtuofn3tc — 10 pza en stock"
                      - option "🔧 Herramienta Premium 🛠️ mqxhud1v6co1 — 2 pza en stock"
                      - option "Sin Stock mqxhuiieewd5 — 0 pza en stock"
                      - option "Refacción E2E mqxhut7orcln — 11 pza en stock"
                      - option "Sin Stock mqxhv05zlbzg — 0 pza en stock"
                      - option "Filtro E2E mqxhv2ub0ovg — 5 pza en stock"
                      - option "Refacción E2E mqxhvdmfwlk3 — 10 pza en stock"
                      - option "Parte Cara mqxhvi2ylicz — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxhvjyq77u6 — 1 pza en stock"
                      - option "Parte Cara mqxhvzvkicnq — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxhw4t5d57g — 1 pza en stock"
                      - option "Badge Test mqxhwvhc30fo — 5 pza en stock"
                      - option "Decimal Test mqxhxe7ltdcv — 3 pza en stock"
                      - option "Decimal Test mqxhxvtmbg67 — 3 pza en stock"
                      - option "Aceite E2E mqxi60wcvgwd — 10 pza en stock"
                      - option "Refacción E2E mqxi6o30vzov — 1 pza en stock"
                      - option "Aceite E2E mqxi6tll8w25 — 10 pza en stock"
                      - option "Refacción E2E mqxi778m0gri — 9 pza en stock"
                      - option "Refacción E2E mqxi7s8u5jxz — 11 pza en stock"
                      - option "Filtro E2E mqxi823l0yok — 5 pza en stock"
                      - option "Refacción E2E mqxi8d26zoxs — 10 pza en stock"
                      - option "Aceite Bajo Stock mqxi8jgn9qda — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxi94a1hg6n — 1 pza en stock"
                      - option "Reset Test mqxiaztb9fpn — 5 pza en stock"
                      - option "Badge Test mqxib2i3fs1l — 5 pza en stock"
                      - option "DoubleClick mqxiws6pbi6x — 0 pza en stock"
                      - option "NavDuring mqxiwygmve0b — 0 pza en stock"
                      - option "Persist Test mqxixc32bj8z — 7 pza en stock"
                      - option "Rapid mqxiyisnqag8 — 0 pza en stock"
                      - option "Refacción E2E mqxizvfjjzgg — 5 pza en stock"
                      - option "Válvula de presión Año 2024 — piñón — 3 pza en stock"
                      - option "Refacción de prueba con nombre extremadamente largo para verificar que la interfaz maneja correctamente textos extensos sin romper el layout ni causar overflow horizontal o vertical en las tarjetas de inventario del sistema — 1 pza en stock"
                      - option "🔧 Herramienta Premium 🛠️ mqxj48ryrupy — 2 pza en stock"
                      - option "Sin Stock mqxj4eaer7bi — 0 pza en stock"
                      - option "Parte Cara mqxj4vgh1xsk — 1 pza en stock"
                      - option "Decimal Test mqxj5hakwruy — 3 pza en stock"
                      - option "Aceite E2E mqxjcroed7l1 — 10 pza en stock"
                      - option "Aceite E2E mqxjdkoernus — 10 pza en stock"
                      - option "Refacción E2E mqxjejw56qtk — 18 pza en stock"
                      - option "Filtro E2E mqxjetvqagyg — 5 pza en stock"
                      - option "Refacción E2E mqxjf4zol178 — 10 pza en stock"
                      - option "Aceite Bajo Stock mqxjfblp8h1e — 1 pza en stock"
                      - option "Aceite Bajo Stock mqxjfwkmk2ws — 1 pza en stock"
                      - option "Badge Test mqxjhewpyi3s — 5 pza en stock"
                  - generic [ref=e121]:
                    - generic [ref=e122]: Cantidad
                    - spinbutton [ref=e123]: "1"
                  - generic [ref=e124]:
                    - generic [ref=e125]: Precio venta ($)
                    - spinbutton [ref=e126]
                - button "+ Agregar pieza" [disabled] [ref=e129]
                - paragraph [ref=e130]: Sin refacciones agregadas. El trabajo se registra con refacciones = $0.00
            - generic [ref=e131]:
              - generic [ref=e132]: ℹ️
              - generic [ref=e133]:
                - text: El IVA se elige cuando el trabajo se
                - strong [ref=e134]: finaliza
                - text: — al presionar el botón 🏁 Finalizar elegirás entre
                - strong [ref=e135]: Nota
                - text: (sin IVA) o
                - strong [ref=e136]: Factura Fiscal
                - text: (IVA 16%).
            - button "✓ Registrar Trabajo" [disabled] [ref=e137]
        - generic [ref=e138]:
          - heading "Historial de Trabajos" [level=3] [ref=e140]
          - table [ref=e142]:
            - rowgroup [ref=e143]:
              - row "Fecha Estado Cliente Unidad Placas Km Descripción Refacciones Mano de Obra Total" [ref=e144]:
                - columnheader "Fecha" [ref=e145]
                - columnheader "Estado" [ref=e146]
                - columnheader "Cliente" [ref=e147]
                - columnheader "Unidad" [ref=e148]
                - columnheader "Placas" [ref=e149]
                - columnheader "Km" [ref=e150]
                - columnheader "Descripción" [ref=e151]
                - columnheader "Refacciones" [ref=e152]
                - columnheader "Mano de Obra" [ref=e153]
                - columnheader "Total" [ref=e154]
                - columnheader [ref=e155]
            - rowgroup [ref=e156]:
              - row "Sin trabajos registrados. Agrega el primero arriba." [ref=e157]:
                - cell "Sin trabajos registrados. Agrega el primero arriba." [ref=e158]:
                  - generic [ref=e159]: Sin trabajos registrados. Agrega el primero arriba.
          - button "▼ Ver cancelados (10)" [ref=e161]
```

# Test source

```ts
  1   | import { test, expect } from '../../fixtures';
  2   | import { expectVisible, showPhaseLabel } from '../visual-assert';
  3   | import { TestData } from '../../utils/test-data';
  4   | 
  5   | /**
  6   |  * Search Across Modules — Cross-module data consistency.
  7   |  *
  8   |  * Verifies that client/vehicle data is consistent across modules:
  9   |  * when you search in cotizaciones, the same client shows in trabajos and CxC.
  10  |  */
  11  | 
  12  | test.describe('Search Across Modules', () => {
  13  |   test.beforeEach(async ({ loginPage }) => {
  14  |     await loginPage.loginAsTestUser();
  15  |   });
  16  | 
  17  |   test('client name appears consistently across modules', async ({
  18  |     page, dashboardPage, sidebar
  19  |   }) => {
  20  |     await showPhaseLabel(page, '🔍 Cross-Module Search');
  21  | 
  22  |     // First get a client name from the Clientes module
  23  |     await dashboardPage.navigateToModule('clientes');
  24  |     await page.waitForTimeout(2000);
  25  | 
  26  |     // Find the first client name in the list
  27  |     const clientTexts = page.locator('.border.rounded-xl, .border.rounded-lg').first();
  28  |     const firstClientText = await clientTexts.textContent();
  29  |     let searchTerm = '';
  30  | 
  31  |     if (firstClientText) {
  32  |       // Extract a usable search term (first word after any icons)
  33  |       const words = firstClientText.trim().split(/\s+/).filter(w => w.length > 2 && !w.match(/[🔧📦💰]/));
  34  |       searchTerm = words[0] || '';
  35  |     }
  36  | 
  37  |     if (searchTerm.length < 2) {
  38  |       // No clients — skip gracefully
  39  |       await showPhaseLabel(page, '⏭️ No clients to search');
  40  |       return;
  41  |     }
  42  | 
  43  |     // ─── Search in Cotizaciones ─────────────────────────────────────────────
  44  |     await showPhaseLabel(page, '📄 Search in Cotizaciones');
  45  |     await sidebar.clickTab('Cotizaciones');
  46  |     await page.waitForTimeout(1500);
  47  | 
  48  |     const cotSearch = page.locator('input[placeholder*="buscar" i]').first();
  49  |     if (await cotSearch.isVisible().catch(() => false)) {
  50  |       await cotSearch.fill(searchTerm);
  51  |       await page.waitForTimeout(1000);
  52  |     }
  53  | 
  54  |     // ─── Search in Trabajos ─────────────────────────────────────────────────
  55  |     await showPhaseLabel(page, '🔧 Search in Trabajos');
  56  |     await sidebar.clickTab('Trabajos');
  57  |     await page.waitForTimeout(1500);
  58  | 
  59  |     const trabSearch = page.locator('input[placeholder*="buscar" i]').first();
  60  |     if (await trabSearch.isVisible().catch(() => false)) {
  61  |       await trabSearch.fill(searchTerm);
  62  |       await page.waitForTimeout(1000);
  63  |     }
  64  | 
  65  |     // ─── Verify consistency ─────────────────────────────────────────────────
  66  |     await showPhaseLabel(page, '✅ Cross-Module Consistent');
  67  |     // No crash, no "undefined", no errors across all modules
  68  |     const bodyText = await page.locator('main').innerText().catch(() => '');
  69  |     expect(bodyText).not.toContain('undefined');
  70  |     expect(bodyText).not.toContain('NaN');
  71  | 
  72  |     await showPhaseLabel(page, '🎉 Search Across Modules Complete');
  73  |   });
  74  | 
  75  |   test('sidebar badge counts are consistent with module data', async ({
  76  |     page, dashboardPage, sidebar, trabajosPage, cuentasCobrarPage
  77  |   }) => {
  78  |     await showPhaseLabel(page, '🔢 Badge Consistency Check');
  79  |     await dashboardPage.waitForPageLoad();
  80  | 
  81  |     // Get badge count for Trabajos
  82  |     const trabajosBadge = await sidebar.getBadgeCount('Trabajos');
  83  | 
  84  |     // Navigate to Trabajos and count items
  85  |     await sidebar.clickTab('Trabajos');
  86  |     await trabajosPage.waitForPageLoad();
  87  |     await page.waitForTimeout(1000);
  88  | 
  89  |     const trabajoCount = await trabajosPage.getTrabajoCount();
  90  | 
  91  |     // Badge should reflect actual count (pending ones or total)
  92  |     // We just verify they're both numbers and not wildly inconsistent
  93  |     if (trabajosBadge !== null) {
  94  |       expect(trabajosBadge).toBeGreaterThanOrEqual(0);
  95  |       // Badge might show pending count, not total
> 96  |       expect(trabajosBadge).toBeLessThanOrEqual(trabajoCount + 1);
      |                             ^ Error: expect(received).toBeLessThanOrEqual(expected)
  97  |     }
  98  | 
  99  |     // Check Por Cobrar badge
  100 |     const cxcBadge = await sidebar.getBadgeCount('Por Cobrar');
  101 |     await sidebar.clickTab('Por Cobrar');
  102 |     await cuentasCobrarPage.waitForPageLoad();
  103 |     const cxcCount = await cuentasCobrarPage.getAccountCount();
  104 | 
  105 |     if (cxcBadge !== null) {
  106 |       expect(cxcBadge).toBeGreaterThanOrEqual(0);
  107 |       expect(cxcBadge).toBeLessThanOrEqual(cxcCount + 1);
  108 |     }
  109 | 
  110 |     await showPhaseLabel(page, '✅ Badges Match Data');
  111 |   });
  112 | });
  113 | 
```