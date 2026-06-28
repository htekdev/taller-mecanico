# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: validation/date-handling.spec.ts >> Date Handling >> no Invalid Date text across all modules
- Location: e2e/tests/validation/date-handling.spec.ts:20:7

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Target page, context or browser has been closed
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
        - generic [ref=e64]:
          - heading "Cotizaciones" [level=2] [ref=e65]
          - paragraph [ref=e66]: Crea y guarda cotizaciones para tus clientes
        - heading "Nueva Cotización" [level=3] [ref=e67]
        - generic [ref=e68]:
          - button "🏛️ Ayuntamiento de Mérida Inventario, O.S. y Departamento" [ref=e69]:
            - generic [ref=e70]: 🏛️
            - generic [ref=e71]:
              - generic [ref=e72]: Ayuntamiento de Mérida
              - generic [ref=e73]: Inventario, O.S. y Departamento
          - button "♻️ Red Ambiental Núm. Proveedor fijo P004093" [ref=e74]:
            - generic [ref=e75]: ♻️
            - generic [ref=e76]:
              - generic [ref=e77]: Red Ambiental
              - generic [ref=e78]: Núm. Proveedor fijo P004093
          - button "🔧 DIMMSA / General Selecciona cliente y vehículo" [ref=e79]:
            - generic [ref=e80]: 🔧
            - generic [ref=e81]:
              - generic [ref=e82]: DIMMSA / General
              - generic [ref=e83]: Selecciona cliente y vehículo
        - generic [ref=e84]:
          - generic [ref=e85]:
            - heading "📋 Historial de Cotizaciones" [level=3] [ref=e86]
            - generic [ref=e87]:
              - generic [ref=e88]: "Filtrar:"
              - combobox [ref=e89]:
                - option "Todos los clientes" [selected]
                - option "Andrés Flores"
                - option "Carlos Medina"
          - generic [ref=e90]:
            - generic [ref=e91]:
              - generic [ref=e92]: No. Cot.
              - generic [ref=e93]: Cliente
              - generic [ref=e94]: Fecha
              - generic [ref=e95]: Total
            - generic [ref=e97]:
              - generic [ref=e99]: COT-033
              - generic [ref=e100]:
                - paragraph [ref=e101]: Andrés Flores
                - paragraph [ref=e102]: 🔧 DIMMSA / General
              - generic [ref=e103]: 28/06/26
              - generic [ref=e104]: $500.00
              - generic [ref=e105]:
                - button "Ver →" [ref=e106]
                - button "🔧 Convertir" [ref=e107]
                - button "Cancelar" [ref=e108]
            - generic [ref=e109]:
              - generic [ref=e111]: COT-032
              - generic [ref=e112]:
                - paragraph [ref=e113]: Andrés Flores
                - paragraph [ref=e114]: 🔧 DIMMSA / General
              - generic [ref=e115]: 28/06/26
              - generic [ref=e116]: $500.00
              - generic [ref=e117]:
                - button "Ver →" [ref=e118]
                - button "🔧 Convertir" [ref=e119]
                - button "Cancelar" [ref=e120]
            - generic [ref=e121]:
              - generic [ref=e123]: COT-031
              - generic [ref=e124]:
                - paragraph [ref=e125]: Andrés Flores
                - paragraph [ref=e126]: 🔧 DIMMSA / General
              - generic [ref=e127]: 28/06/26
              - generic [ref=e128]: $0.00
              - generic [ref=e129]:
                - button "Ver →" [ref=e130]
                - button "🔧 Convertir" [ref=e131]
                - button "Cancelar" [ref=e132]
            - generic [ref=e133]:
              - generic [ref=e135]: COT-030
              - generic [ref=e136]:
                - paragraph [ref=e137]: Andrés Flores
                - paragraph [ref=e138]: 🔧 DIMMSA / General
              - generic [ref=e139]: 28/06/26
              - generic [ref=e140]: $0.00
              - generic [ref=e141]:
                - button "Ver →" [ref=e142]
                - button "🔧 Convertir" [ref=e143]
                - button "Cancelar" [ref=e144]
            - generic [ref=e145]:
              - generic [ref=e147]: COT-029
              - generic [ref=e148]:
                - paragraph [ref=e149]: Andrés Flores
                - paragraph [ref=e150]: 🔧 DIMMSA / General
              - generic [ref=e151]: 28/06/26
              - generic [ref=e152]: $350.00
              - generic [ref=e153]:
                - button "Ver →" [ref=e154]
                - button "🔧 Convertir" [ref=e155]
                - button "Cancelar" [ref=e156]
            - generic [ref=e157]:
              - generic [ref=e159]: COT-028
              - generic [ref=e160]:
                - paragraph [ref=e161]: Andrés Flores
                - paragraph [ref=e162]: 🔧 DIMMSA / General
              - generic [ref=e163]: 28/06/26
              - generic [ref=e164]: $350.00
              - generic [ref=e165]:
                - button "Ver →" [ref=e166]
                - button "🔧 Convertir" [ref=e167]
                - button "Cancelar" [ref=e168]
            - generic [ref=e169]:
              - generic [ref=e171]: COT-027
              - generic [ref=e172]:
                - paragraph [ref=e173]: Andrés Flores
                - paragraph [ref=e174]: 🔧 DIMMSA / General
              - generic [ref=e175]: 28/06/26
              - generic [ref=e176]: $500.00
              - generic [ref=e177]:
                - button "Ver →" [ref=e178]
                - button "🔧 Convertir" [ref=e179]
                - button "Cancelar" [ref=e180]
            - generic [ref=e181]:
              - generic [ref=e183]: COT-026
              - generic [ref=e184]:
                - paragraph [ref=e185]: Andrés Flores
                - paragraph [ref=e186]: 🔧 DIMMSA / General
              - generic [ref=e187]: 28/06/26
              - generic [ref=e188]: $500.00
              - generic [ref=e189]:
                - button "Ver →" [ref=e190]
                - button "🔧 Convertir" [ref=e191]
                - button "Cancelar" [ref=e192]
            - generic [ref=e193]:
              - generic [ref=e195]: COT-025
              - generic [ref=e196]:
                - paragraph [ref=e197]: Andrés Flores
                - paragraph [ref=e198]: 🔧 DIMMSA / General
              - generic [ref=e199]: 28/06/26
              - generic [ref=e200]: $0.00
              - generic [ref=e201]:
                - button "Ver →" [ref=e202]
                - button "🔧 Convertir" [ref=e203]
                - button "Cancelar" [ref=e204]
            - generic [ref=e205]:
              - generic [ref=e207]: COT-024
              - generic [ref=e208]:
                - paragraph [ref=e209]: Andrés Flores
                - paragraph [ref=e210]: 🔧 DIMMSA / General
              - generic [ref=e211]: 28/06/26
              - generic [ref=e212]: $0.00
              - generic [ref=e213]:
                - button "Ver →" [ref=e214]
                - button "🔧 Convertir" [ref=e215]
                - button "Cancelar" [ref=e216]
            - generic [ref=e217]:
              - generic [ref=e219]: COT-023
              - generic [ref=e220]:
                - paragraph [ref=e221]: Andrés Flores
                - paragraph [ref=e222]: 🔧 DIMMSA / General
              - generic [ref=e223]: 28/06/26
              - generic [ref=e224]: $500.00
              - generic [ref=e225]:
                - button "Ver →" [ref=e226]
                - button "🔧 Convertir" [ref=e227]
                - button "Cancelar" [ref=e228]
            - generic [ref=e229]:
              - generic [ref=e231]: COT-022
              - generic [ref=e232]:
                - paragraph [ref=e233]: Andrés Flores
                - paragraph [ref=e234]: 🔧 DIMMSA / General
              - generic [ref=e235]: 28/06/26
              - generic [ref=e236]: $500.00
              - generic [ref=e237]:
                - button "Ver →" [ref=e238]
                - button "🔧 Convertir" [ref=e239]
                - button "Cancelar" [ref=e240]
            - generic [ref=e241]:
              - generic [ref=e243]: COT-021
              - generic [ref=e244]:
                - paragraph [ref=e245]: Andrés Flores
                - paragraph [ref=e246]: 🔧 DIMMSA / General
              - generic [ref=e247]: 28/06/26
              - generic [ref=e248]: $350.00
              - generic [ref=e249]:
                - button "Ver →" [ref=e250]
                - button "🔧 Convertir" [ref=e251]
                - button "Cancelar" [ref=e252]
            - generic [ref=e253]:
              - generic [ref=e255]: COT-020
              - generic [ref=e256]:
                - paragraph [ref=e257]: Andrés Flores
                - paragraph [ref=e258]: 🔧 DIMMSA / General
              - generic [ref=e259]: 28/06/26
              - generic [ref=e260]: $350.00
              - generic [ref=e261]:
                - button "Ver →" [ref=e262]
                - button "🔧 Convertir" [ref=e263]
                - button "Cancelar" [ref=e264]
            - generic [ref=e265]:
              - generic [ref=e267]: COT-019
              - generic [ref=e268]:
                - paragraph [ref=e269]: Carlos Medina
                - paragraph [ref=e270]: 🔧 DIMMSA / General
              - generic [ref=e271]: 28/06/26
              - generic [ref=e272]: $0.00
              - generic [ref=e273]:
                - button "Ver →" [ref=e274]
                - button "🔧 Convertir" [ref=e275]
                - button "Cancelar" [ref=e276]
            - generic [ref=e277]:
              - generic [ref=e279]: COT-018
              - generic [ref=e280]:
                - paragraph [ref=e281]: Carlos Medina
                - paragraph [ref=e282]: 🔧 DIMMSA / General
              - generic [ref=e283]: 28/06/26
              - generic [ref=e284]: $0.00
              - generic [ref=e285]:
                - button "Ver →" [ref=e286]
                - button "🔧 Convertir" [ref=e287]
                - button "Cancelar" [ref=e288]
            - generic [ref=e289]:
              - generic [ref=e291]: COT-017
              - generic [ref=e292]:
                - paragraph [ref=e293]: Carlos Medina
                - paragraph [ref=e294]: 🔧 DIMMSA / General
              - generic [ref=e295]: 28/06/26
              - generic [ref=e296]: $350.00
              - generic [ref=e297]:
                - button "Ver →" [ref=e298]
                - button "🔧 Convertir" [ref=e299]
                - button "Cancelar" [ref=e300]
            - generic [ref=e301]:
              - generic [ref=e303]: COT-016
              - generic [ref=e304]:
                - paragraph [ref=e305]: Carlos Medina
                - paragraph [ref=e306]: 🔧 DIMMSA / General
              - generic [ref=e307]: 28/06/26
              - generic [ref=e308]: $350.00
              - generic [ref=e309]:
                - button "Ver →" [ref=e310]
                - button "🔧 Convertir" [ref=e311]
                - button "Cancelar" [ref=e312]
            - generic [ref=e313]:
              - generic [ref=e315]: COT-015
              - generic [ref=e316]:
                - paragraph [ref=e317]: Andrés Flores
                - paragraph [ref=e318]: 🔧 DIMMSA / General
              - generic [ref=e319]: 28/06/26
              - generic [ref=e320]: $500.00
              - generic [ref=e321]:
                - button "Ver →" [ref=e322]
                - button "🔧 Convertir" [ref=e323]
                - button "Cancelar" [ref=e324]
            - generic [ref=e325]:
              - generic [ref=e327]: COT-014
              - generic [ref=e328]:
                - paragraph [ref=e329]: Andrés Flores
                - paragraph [ref=e330]: 🔧 DIMMSA / General
              - generic [ref=e331]: 28/06/26
              - generic [ref=e332]: $500.00
              - generic [ref=e333]:
                - button "Ver →" [ref=e334]
                - button "🔧 Convertir" [ref=e335]
                - button "Cancelar" [ref=e336]
            - generic [ref=e337]:
              - generic [ref=e339]: COT-013
              - generic [ref=e340]:
                - paragraph [ref=e341]: Andrés Flores
                - paragraph [ref=e342]: 🔧 DIMMSA / General
              - generic [ref=e343]: 28/06/26
              - generic [ref=e344]: $500.00
              - generic [ref=e345]:
                - button "Ver →" [ref=e346]
                - button "🔧 Convertir" [ref=e347]
                - button "Cancelar" [ref=e348]
            - generic [ref=e349]:
              - generic [ref=e351]: COT-012
              - generic [ref=e352]:
                - paragraph [ref=e353]: Andrés Flores
                - paragraph [ref=e354]: 🔧 DIMMSA / General
              - generic [ref=e355]: 28/06/26
              - generic [ref=e356]: $0.00
              - generic [ref=e357]:
                - button "Ver →" [ref=e358]
                - button "🔧 Convertir" [ref=e359]
                - button "Cancelar" [ref=e360]
            - generic [ref=e361]:
              - generic [ref=e363]: COT-011
              - generic [ref=e364]:
                - paragraph [ref=e365]: Andrés Flores
                - paragraph [ref=e366]: 🔧 DIMMSA / General
              - generic [ref=e367]: 28/06/26
              - generic [ref=e368]: $0.00
              - generic [ref=e369]:
                - button "Ver →" [ref=e370]
                - button "🔧 Convertir" [ref=e371]
                - button "Cancelar" [ref=e372]
            - generic [ref=e373]:
              - generic [ref=e375]: COT-010
              - generic [ref=e376]:
                - paragraph [ref=e377]: Andrés Flores
                - paragraph [ref=e378]: 🔧 DIMMSA / General
              - generic [ref=e379]: 28/06/26
              - generic [ref=e380]: $0.00
              - generic [ref=e381]:
                - button "Ver →" [ref=e382]
                - button "🔧 Convertir" [ref=e383]
                - button "Cancelar" [ref=e384]
            - generic [ref=e385]:
              - generic [ref=e387]: COT-009
              - generic [ref=e388]:
                - paragraph [ref=e389]: Andrés Flores
                - paragraph [ref=e390]: 🔧 DIMMSA / General
              - generic [ref=e391]: 28/06/26
              - generic [ref=e392]: $350.00
              - generic [ref=e393]:
                - button "Ver →" [ref=e394]
                - button "🔧 Convertir" [ref=e395]
                - button "Cancelar" [ref=e396]
            - generic [ref=e397]:
              - generic [ref=e399]: COT-008
              - generic [ref=e400]:
                - paragraph [ref=e401]: Andrés Flores
                - paragraph [ref=e402]: 🔧 DIMMSA / General
              - generic [ref=e403]: 28/06/26
              - generic [ref=e404]: $350.00
              - generic [ref=e405]:
                - button "Ver →" [ref=e406]
                - button "🔧 Convertir" [ref=e407]
                - button "Cancelar" [ref=e408]
            - generic [ref=e409]:
              - generic [ref=e411]: COT-007
              - generic [ref=e412]:
                - paragraph [ref=e413]: Andrés Flores
                - paragraph [ref=e414]: 🔧 DIMMSA / General
              - generic [ref=e415]: 28/06/26
              - generic [ref=e416]: $350.00
              - generic [ref=e417]:
                - button "Ver →" [ref=e418]
                - button "🔧 Convertir" [ref=e419]
                - button "Cancelar" [ref=e420]
            - generic [ref=e421]:
              - generic [ref=e423]: COT-006
              - generic [ref=e424]:
                - paragraph [ref=e425]: Carlos Medina
                - paragraph [ref=e426]: 🔧 DIMMSA / General
              - generic [ref=e427]: 28/06/26
              - generic [ref=e428]: $0.00
              - generic [ref=e429]:
                - button "Ver →" [ref=e430]
                - button "🔧 Convertir" [ref=e431]
                - button "Cancelar" [ref=e432]
            - generic [ref=e433]:
              - generic [ref=e435]: COT-005
              - generic [ref=e436]:
                - paragraph [ref=e437]: Carlos Medina
                - paragraph [ref=e438]: 🔧 DIMMSA / General
              - generic [ref=e439]: 28/06/26
              - generic [ref=e440]: $0.00
              - generic [ref=e441]:
                - button "Ver →" [ref=e442]
                - button "🔧 Convertir" [ref=e443]
                - button "Cancelar" [ref=e444]
            - generic [ref=e445]:
              - generic [ref=e447]: COT-004
              - generic [ref=e448]:
                - paragraph [ref=e449]: Carlos Medina
                - paragraph [ref=e450]: 🔧 DIMMSA / General
              - generic [ref=e451]: 28/06/26
              - generic [ref=e452]: $0.00
              - generic [ref=e453]:
                - button "Ver →" [ref=e454]
                - button "🔧 Convertir" [ref=e455]
                - button "Cancelar" [ref=e456]
            - generic [ref=e457]:
              - generic [ref=e459]: COT-003
              - generic [ref=e460]:
                - paragraph [ref=e461]: Carlos Medina
                - paragraph [ref=e462]: 🔧 DIMMSA / General
              - generic [ref=e463]: 28/06/26
              - generic [ref=e464]: $350.00
              - generic [ref=e465]:
                - button "Ver →" [ref=e466]
                - button "🔧 Convertir" [ref=e467]
                - button "Cancelar" [ref=e468]
            - generic [ref=e469]:
              - generic [ref=e471]: COT-002
              - generic [ref=e472]:
                - paragraph [ref=e473]: Carlos Medina
                - paragraph [ref=e474]: 🔧 DIMMSA / General
              - generic [ref=e475]: 28/06/26
              - generic [ref=e476]: $350.00
              - generic [ref=e477]:
                - button "Ver →" [ref=e478]
                - button "🔧 Convertir" [ref=e479]
                - button "Cancelar" [ref=e480]
            - generic [ref=e481]:
              - generic [ref=e483]: COT-001
              - generic [ref=e484]:
                - paragraph [ref=e485]: Carlos Medina
                - paragraph [ref=e486]: 🔧 DIMMSA / General
              - generic [ref=e487]: 28/06/26
              - generic [ref=e488]: $350.00
              - generic [ref=e489]:
                - button "Ver →" [ref=e490]
                - button "🔧 Convertir" [ref=e491]
                - button "Cancelar" [ref=e492]
```

# Test source

```ts
  1  | import type { Page, Locator } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Sidebar Component — Tab navigation bar.
  5  |  *
  6  |  * Encapsulates all navigation interactions and badge reading.
  7  |  */
  8  | export class Sidebar {
  9  |   readonly nav: Locator;
  10 | 
  11 |   constructor(private readonly page: Page) {
  12 |     this.nav = page.locator('nav');
  13 |   }
  14 | 
  15 |   /** Click a nav tab by its label text. */
  16 |   async clickTab(label: string) {
> 17 |     await this.nav.getByRole('button', { name: label }).click();
     |                                                         ^ Error: locator.click: Target page, context or browser has been closed
  18 |     await this.page.waitForTimeout(500);
  19 |   }
  20 | 
  21 |   /** Get the active (highlighted) tab text. */
  22 |   async getActiveTabLabel(): Promise<string> {
  23 |     const active = this.nav.locator('button.bg-indigo-600');
  24 |     return (await active.textContent())?.trim() ?? '';
  25 |   }
  26 | 
  27 |   /** Check if a tab has a warning badge (⚠). */
  28 |   async hasWarningBadge(label: string): Promise<boolean> {
  29 |     const tab = this.nav.getByRole('button', { name: label });
  30 |     const badge = tab.locator('span:has-text("⚠")');
  31 |     return badge.isVisible().catch(() => false);
  32 |   }
  33 | 
  34 |   /** Check if a tab has a pending badge (🕐). */
  35 |   async hasPendingBadge(label: string): Promise<boolean> {
  36 |     const tab = this.nav.getByRole('button', { name: label });
  37 |     const badge = tab.locator('span:has-text("🕐")');
  38 |     return badge.isVisible().catch(() => false);
  39 |   }
  40 | 
  41 |   /** Get all visible tab labels. */
  42 |   async getAllTabLabels(): Promise<string[]> {
  43 |     const buttons = await this.nav.locator('button').all();
  44 |     const labels: string[] = [];
  45 |     for (const btn of buttons) {
  46 |       const text = await btn.textContent();
  47 |       if (text) labels.push(text.trim());
  48 |     }
  49 |     return labels;
  50 |   }
  51 | 
  52 |   /** Get the badge count number for a tab. */
  53 |   async getBadgeCount(label: string): Promise<number | null> {
  54 |     const tab = this.nav.getByRole('button', { name: label });
  55 |     const badge = tab.locator('span.text-xs.font-bold');
  56 |     if (await badge.isVisible().catch(() => false)) {
  57 |       const text = (await badge.textContent())?.replace(/[^\d]/g, '');
  58 |       return text ? parseInt(text) : null;
  59 |     }
  60 |     return null;
  61 |   }
  62 | }
  63 | 
```