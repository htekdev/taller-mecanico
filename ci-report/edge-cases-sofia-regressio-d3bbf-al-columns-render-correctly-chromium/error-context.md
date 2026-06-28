# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: edge-cases/sofia-regressions.spec.ts >> Sofia Regression Tests >> REGRESSION: conditional columns render correctly
- Location: e2e/tests/edge-cases/sofia-regressions.spec.ts:202:7

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: page.evaluate: Target page, context or browser has been closed
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
        - button "👥 Clientes 27" [ref=e15]:
          - generic [ref=e16]: 👥
          - generic [ref=e17]: Clientes
          - generic [ref=e18]: "27"
        - button "📦 Inventario ⚠ 31" [ref=e19]:
          - generic [ref=e20]: 📦
          - generic [ref=e21]: Inventario
          - generic [ref=e22]: ⚠ 31
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
        - button "💰 Por Cobrar 4" [active] [ref=e39]:
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
          - heading "Cuentas por Cobrar" [level=2] [ref=e65]
          - paragraph [ref=e66]: "Pagos de clientes: facturas emitidas y trabajos pendientes de cobro."
        - generic [ref=e67]:
          - generic [ref=e69]:
            - generic [ref=e70]: 🔍 Buscar cliente
            - textbox "Nombre del cliente..." [ref=e72]
          - generic [ref=e73]:
            - generic [ref=e74]: "Pendientes:"
            - button "Carlos Medina · $775.00" [ref=e75]
            - button "Juan Torres · $910.00" [ref=e76]
        - generic [ref=e78]:
          - generic [ref=e79]: Total por Cobrar
          - generic [ref=e80]: $1,685.00
        - generic [ref=e81]:
          - button "Todos (3)" [ref=e82]
          - button "Pendiente (3)" [ref=e83]
          - button "Parcial (0)" [ref=e84]
          - button "Pagado (0)" [ref=e85]
        - generic [ref=e86]:
          - button "📋 Todo" [ref=e87]
          - button "📄 Solo notas" [ref=e88]
          - button "🧾 Solo facturas" [ref=e89]
        - generic [ref=e90]:
          - heading "🧾 Facturas emitidas" [level=3] [ref=e91]
          - generic [ref=e92]:
            - generic [ref=e94]:
              - generic [ref=e95]:
                - generic [ref=e96]:
                  - generic [ref=e97]: FAC-2026-003
                  - generic [ref=e98]: Juan Torres
                  - generic [ref=e99]: Pendiente
                - generic [ref=e100]: 25/6/2026
              - generic [ref=e101]:
                - generic [ref=e102]: Total
                - generic [ref=e103]: $0.00
              - generic [ref=e104]:
                - generic [ref=e105]: Pagado
                - generic [ref=e106]: $0.00
              - generic [ref=e107]:
                - generic [ref=e108]:
                  - generic [ref=e109]: Saldo
                  - generic [ref=e110]: $0.00
                - button "+ Pago" [ref=e111]
            - generic [ref=e113]:
              - generic [ref=e114]:
                - generic [ref=e115]:
                  - generic [ref=e116]: FAC-2026-002
                  - generic [ref=e117]: Juan Torres
                  - generic [ref=e118]: Pendiente
                - generic [ref=e119]: 10/6/2026
              - generic [ref=e120]:
                - generic [ref=e121]: Total
                - generic [ref=e122]: $910.00
              - generic [ref=e123]:
                - generic [ref=e124]: Pagado
                - generic [ref=e125]: $0.00
              - generic [ref=e126]:
                - generic [ref=e127]:
                  - generic [ref=e128]: Saldo
                  - generic [ref=e129]: $910.00
                - button "+ Pago" [ref=e130]
            - generic [ref=e132]:
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - generic [ref=e135]: FAC-2026-001
                  - generic [ref=e136]: Carlos Medina
                  - generic [ref=e137]: Pendiente
                - generic [ref=e138]: 5/6/2026
              - generic [ref=e139]:
                - generic [ref=e140]: Total
                - generic [ref=e141]: $775.00
              - generic [ref=e142]:
                - generic [ref=e143]: Pagado
                - generic [ref=e144]: $0.00
              - generic [ref=e145]:
                - generic [ref=e146]:
                  - generic [ref=e147]: Saldo
                  - generic [ref=e148]: $775.00
                - button "+ Pago" [ref=e149]
        - group [ref=e151]:
          - generic "Ver notas canceladas (1)" [ref=e152] [cursor=pointer]
```

# Test source

```ts
  105 |   const color = passed ? '#4ade80' : '#ef4444';
  106 |   await locator.evaluate((el, color) => {
  107 |     el.style.animation = '';
  108 |     el.style.boxShadow = `0 0 12px 6px ${color}`;
  109 |   }, color).catch(() => {});
  110 |   await locator.page().waitForTimeout(FLASH_DURATION);
  111 |   await removeHighlight(locator);
  112 | }
  113 | 
  114 | // ─── Public API ──────────────────────────────────────────────────────────────
  115 | 
  116 | /** Assert element is visible with green pulsing highlight. */
  117 | export async function expectVisible(locator: Locator, label?: string) {
  118 |   const page = locator.page();
  119 |   await highlight(locator, '#00ff00', label || '✓ visible');
  120 |   await expect(locator).toBeVisible();
  121 |   const count = incrementCount(page);
  122 |   await updateAssertionCounter(page, count);
  123 |   await flashResult(locator, true);
  124 | }
  125 | 
  126 | /** Assert element is NOT visible. */
  127 | export async function expectHidden(locator: Locator, label?: string) {
  128 |   const page = locator.page();
  129 |   await expect(locator).not.toBeVisible();
  130 |   const count = incrementCount(page);
  131 |   await updateAssertionCounter(page, count);
  132 | }
  133 | 
  134 | /** Assert element contains specific text with blue pulsing highlight. */
  135 | export async function expectText(locator: Locator, text: string | RegExp, label?: string) {
  136 |   const page = locator.page();
  137 |   await highlight(locator, '#3b82f6', label || `✓ "${text}"`);
  138 |   if (typeof text === 'string') {
  139 |     await expect(locator).toContainText(text);
  140 |   } else {
  141 |     await expect(locator).toHaveText(text);
  142 |   }
  143 |   const count = incrementCount(page);
  144 |   await updateAssertionCounter(page, count);
  145 |   await flashResult(locator, true);
  146 | }
  147 | 
  148 | /** Assert element has a specific CSS class with yellow highlight. */
  149 | export async function expectClass(locator: Locator, classPattern: RegExp, label?: string) {
  150 |   const page = locator.page();
  151 |   await highlight(locator, '#fbbf24', label || '✓ class');
  152 |   await expect(locator).toHaveClass(classPattern);
  153 |   const count = incrementCount(page);
  154 |   await updateAssertionCounter(page, count);
  155 |   await flashResult(locator, true);
  156 | }
  157 | 
  158 | /** Assert element is disabled with yellow highlight. */
  159 | export async function expectDisabled(locator: Locator, label?: string) {
  160 |   const page = locator.page();
  161 |   await highlight(locator, '#fbbf24', label || '✓ disabled');
  162 |   await expect(locator).toBeDisabled();
  163 |   const count = incrementCount(page);
  164 |   await updateAssertionCounter(page, count);
  165 |   await flashResult(locator, true);
  166 | }
  167 | 
  168 | /** Assert element is enabled with green highlight. */
  169 | export async function expectEnabled(locator: Locator, label?: string) {
  170 |   const page = locator.page();
  171 |   await highlight(locator, '#00ff00', label || '✓ enabled');
  172 |   await expect(locator).toBeEnabled();
  173 |   const count = incrementCount(page);
  174 |   await updateAssertionCounter(page, count);
  175 |   await flashResult(locator, true);
  176 | }
  177 | 
  178 | /** Assert element has a specific value with magenta highlight. */
  179 | export async function expectValue(locator: Locator, value: string, label?: string) {
  180 |   const page = locator.page();
  181 |   await highlight(locator, '#e879f9', label || `✓ value="${value}"`);
  182 |   await expect(locator).toHaveValue(value);
  183 |   const count = incrementCount(page);
  184 |   await updateAssertionCounter(page, count);
  185 |   await flashResult(locator, true);
  186 | }
  187 | 
  188 | /** Assert element count matches expected. */
  189 | export async function expectCount(locator: Locator, count: number, label?: string) {
  190 |   const page = locator.page();
  191 |   await expect(locator).toHaveCount(count);
  192 |   const c = incrementCount(page);
  193 |   await updateAssertionCounter(page, c);
  194 | }
  195 | 
  196 | /** Assert URL matches pattern. */
  197 | export async function expectURL(page: Page, pattern: string | RegExp) {
  198 |   await expect(page).toHaveURL(pattern);
  199 |   const count = incrementCount(page);
  200 |   await updateAssertionCounter(page, count);
  201 | }
  202 | 
  203 | /** Visual phase label overlay — marks phases in video recording. */
  204 | export async function showPhaseLabel(page: Page, text: string, duration = 800) {
> 205 |   await page.evaluate(({ text }) => {
      |              ^ Error: page.evaluate: Target page, context or browser has been closed
  206 |     const prev = document.getElementById('__e2e_phase_label');
  207 |     if (prev) prev.remove();
  208 |     const overlay = document.createElement('div');
  209 |     overlay.id = '__e2e_phase_label';
  210 |     overlay.textContent = text;
  211 |     overlay.style.cssText = `
  212 |       position: fixed; top: 12px; right: 12px; z-index: 999999;
  213 |       background: rgba(0,0,0,0.9); color: #fff; font-size: 16px;
  214 |       font-weight: bold; padding: 10px 20px; border-radius: 10px;
  215 |       font-family: system-ui, sans-serif; pointer-events: none;
  216 |       border: 2px solid rgba(255,255,255,0.3);
  217 |       box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  218 |     `;
  219 |     document.body.appendChild(overlay);
  220 |   }, { text });
  221 |   await page.waitForTimeout(duration);
  222 |   await page.evaluate(() => {
  223 |     const el = document.getElementById('__e2e_phase_label');
  224 |     if (el) el.remove();
  225 |   });
  226 | }
  227 | 
```