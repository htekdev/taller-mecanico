import type { Page, Locator } from '@playwrig ht/test';
import { BasePage } from './BasePag e';

/**
 * InventarioPage — Manages the in ventory (parts) module.
 *
 * Covers: adding  parts, editing, receiving stock, filtering by 
 * category/proveedor, compatibility managem ent, search.
 */
export class InventarioPage  extends BasePage {
  // ─── Section loc ators ───────────── ─────────────── ─────────────── ───────────
  readonly  sectionTitle: Locator;

  // ─── Add pa rt form ────────────� ��──────────────� ��──────────────� ��──────────────
   readonly nombreInput: Locator;
  readonly c odigoInput: Locator;
  readonly categoriaSele ct: Locator;
  readonly unidadSelect: Locator ;
  readonly precioCompraInput: Locator;
  re adonly stockInput: Locator;
  readonly stockM inimoInput: Locator;
  readonly proveedorSele ct: Locator;
  readonly clienteSelect: Locato r;
  readonly vehiculoSelect: Locator;
  read only agregarButton: Locator;

  // ───  Filters ────────────� ��──────────────� ��──────────────� ��──────────────� ��─────
  readonly filtroProveedorS elect: Locator;
  readonly filtroCategoriaSel ect: Locator;

  // ─── Inventory list  ─────────────── ─────────────── ─────────────── ───────────
  readonly  inventarioList: Locator;
  readonly partRows:  Locator;

  // ─── Compatibility ─� �──────────────� �──────────────� �──────────────� �──────────
  readonly ad dCompatButton: Locator;
  readonly compatMarc aInput: Locator;
  readonly compatModeloInput : Locator;

  // ─── Stock receive ─� ��──────────────� ��──────────────� ��──────────────� ��──────────
  readonly r ecibirStockInput: Locator;
  readonly recibir StockButton: Locator;

  constructor(page: Pa ge) {
    super(page);
    this.sectionTitle  = page.locator('h2:has-text("Inventario")');
 
    // Form inputs — use placeholder text  matching
    this.nombreInput = page.locator( 'input[placeholder*="Filtro de aceite" i], in put[placeholder*="nombre" i]').first();
    t his.codigoInput = page.locator('input[placeho lder*="codigo" i], input[placeholder*="COD" i ]').first();
    this.categoriaSelect = page. locator('select:has(option:has-text("Filtros" ))').first();
    this.unidadSelect = page.lo cator('select:has(option:has-text("pza"))').f irst();
    this.precioCompraInput = page.loc ator('input[placeholder="0.00"]').first();
     this.stockInput = page.locator('input[type= "number"]').nth(1);
    this.stockMinimoInput  = page.locator('input[type="number"]').nth(2 );
    this.proveedorSelect = page.locator('s elect:has(option:has-text("Proveedor"))').fir st();
    this.clienteSelect = page.locator(' select:has(option:has-text("Cliente"))').firs t();
    this.vehiculoSelect = page.locator(' select:has(option:has-text("Vehiculo"))').fir st();
    this.agregarButton = page.getByRole ('button', { name: /agregar al inventario/i } );

    // Filters
    this.filtroProveedorSe lect = page.locator('select:has(option:has-te xt("Todos los proveedores"))').first();
    t his.filtroCategoriaSelect = page.locator('sel ect:has(option:has-text("Todas las categorias "))').first();

    // List
    this.inventar ioList = page.locator('.space-y-2, .divide-y' ).first();
    this.partRows = page.locator(' .border.rounded-lg, .border.rounded-xl, [data -testid="part-row"]');

    // Compatibility
     this.addCompatButton = page.getByRole('bu tton', { name: /agregar marca|compatibilidad/ i }).first();
    this.compatMarcaInput = pag e.locator('input[placeholder*="marca" i]').fi rst();
    this.compatModeloInput = page.loca tor('input[placeholder*="modelo" i]').first() ;

    // Stock receive
    this.recibirStock Input = page.locator('input[type="number"][pl aceholder*="recibir" i], input[placeholder*=" cantidad" i]').first();
    this.recibirStock Button = page.getByRole('button', { name: /re cibir|\\+/i }).first();
  }

  async waitForP ageLoad() {
    await this.sectionTitle.waitF or({ state: 'visible', timeout: 90_000 });
   }

  async addPart(data: {
    nombre: string ;
    codigo?: string;
    categoria?: string ;
    precioCompra?: number;
    stock?: numb er;
    stockMinimo?: number;
  }) {
    awai t this.fillInput(this.nombreInput, data.nombr e);

    if (data.codigo && await this.codigo Input.isVisible().catch(() => false)) {
       await this.fillInput(this.codigoInput, data. codigo);
    }

    if (data.categoria && awa it this.categoriaSelect.isVisible().catch(()  => false)) {
      await this.categoriaSelect .selectOption({ label: data.categoria });
     }

    // precioCompra must be > 0 or the su bmit button stays disabled — default $100
     // Use click+keyboard instead of fill() � � React controlled number inputs don't
    //  reliably pick up Playwright's fill() synthet ic events on all versions.
    const precio =  data.precioCompra ?? 100;
    if (await this .precioCompraInput.isVisible().catch(() => fa lse)) {
      await this.precioCompraInput.cl ick();
      await this.precioCompraInput.pre ss('Control+A');
      await this.page.keyboa rd.type(String(precio));
      await this.pag e.waitForTimeout(300); // let React process t he state update
    }

    if (data.stock !==  undefined && await this.stockInput.isVisible ().catch(() => false)) {
      await this.fil lInput(this.stockInput, String(data.stock));
     }

    if (data.stockMinimo !== undefined  && await this.stockMinimoInput.isVisible().c atch(() => false)) {
      await this.fillInp ut(this.stockMinimoInput, String(data.stockMi nimo));
    }

    await this.agregarButton.c lick();
    await this.page.waitForTimeout(20 00);
  }

  async selectProveedor(index = 1)  {
    if (await this.proveedorSelect.isVisibl e().catch(() => false)) {
      const count =  await this.getOptionCount(this.proveedorSele ct);
      if (count > 1) {
        await thi s.selectByIndex(this.proveedorSelect, Math.mi n(index, count - 1));
      }
    }
  }

  as ync filterByProveedor(proveedorName: string)  {
    if (await this.filtroProveedorSelect.is Visible().catch(() => false)) {
      await t his.filtroProveedorSelect.selectOption({ labe l: proveedorName });
      await this.page.wa itForTimeout(500);
    }
  }

  async filterB yCategoria(categoria: string) {
    if (await  this.filtroCategoriaSelect.isVisible().catch (() => false)) {
      await this.filtroCateg oriaSelect.selectOption({ label: categoria }) ;
      await this.page.waitForTimeout(500);
     }
  }

  async getPartCount(): Promise<nu mber> {
    return this.partRows.count();
  } 

  async isPartVisible(name: string): Promis e<boolean> {
    return this.page.locator(`te xt=${name}`).first().isVisible().catch(() =>  false);
  }

  async expandPart(name: string)  {
    const row = this.page.locator(`text=${ name}`).first();
    await row.click();
    a wait this.page.waitForTimeout(500);
  }

  as ync receiveStock(partName: string, quantity:  number) {
    await this.expandPart(partName) ;
    const container = this.page.locator(`.b order:has(text="${partName}")`).first();
     const input = container.locator('input[type=" number"]').last();
    if (await input.isVisi ble().catch(() => false)) {
      await input .fill(String(quantity));
      const btn = co ntainer.getByRole('button', { name: /recibir| \\+/ }).first();
      await btn.click();
       await this.page.waitForTimeout(1000);
     }
  }

  async wasAddSuccessful(partName: str ing): Promise<boolean> {
    await this.page. waitForTimeout(1000);
    return this.isPartV isible(partName);
  }

  async getStockCount( partName: string): Promise<string> {
    cons t row = this.page.locator(`:has-text("${partN ame}")`).first();
    const stock = row.locat or('text=/\\d+ (pza|lt|kg|m)/').first();
     return this.getText(stock);
  }

  /**
   * 2 -step delete: click the "🗑 Eliminar" butto n in the row for `name`,
   * then either con firm (true) or cancel (false) the deletion.
    *
   * The inventory table renders one row  per part. After clicking "Eliminar",
   * the  same row shows "✓ Confirmar" and "Cancelar " buttons.
   */
  async eliminarPieza(name:  string, confirm: boolean) {
    // Find the t able row that contains this part's name
    c onst row = this.page.locator(`tr:has-text("${ name}")`).first();

    // Click the initial  "🗑 Eliminar" button
    const eliminarBtn  = row.getByRole('button', { name: /Eliminar/i  });
    await eliminarBtn.waitFor({ state: ' visible', timeout: 15_000 });
    await elimi narBtn.click();
    await this.page.waitForTi meout(400);

    if (confirm) {
      // Clic k "✓ Confirmar" to complete the deletion
       const confirmarBtn = row.getByRole('butto n', { name: /Confirmar/i });
      await conf irmarBtn.waitFor({ state: 'visible', timeout:  10_000 });
      await confirmarBtn.click(); 
      await this.page.waitForTimeout(2000);
     } else {
      // Click "Cancelar" to abo rt (part remains in list)
      const cancela rBtn = row.getByRole('button', { name: /^Canc elar$/i });
      await cancelarBtn.waitFor({  state: 'visible', timeout: 10_000 });
       await cancelarBtn.click();
      await this.p age.waitForTimeout(400);
    }
  }

  /**
    * Add a new proveedor via the inline form in  the Inventario add-part panel.
   *
   * Clic ks "+ Nuevo proveedor" to expand the form, fi lls in nombre and telefono,
   * then clicks  "✓ Guardar" to save.
   */
  async agregarP roveedorInline(nombre: string, telefono: stri ng) {
    // Click the toggle button to revea l the inline proveedor form
    const toggleB tn = this.page.getByRole('button', { name: /\ + Nuevo proveedor/i });
    await toggleBtn.w aitFor({ state: 'visible', timeout: 15_000 }) ;
    await toggleBtn.click();
    await this .page.waitForTimeout(500);

    // Fill in th e proveedor name (aria-label="Nombre del prov eedor")
    const nombreInput = this.page.loc ator('[aria-label="Nombre del proveedor"]');
     await nombreInput.waitFor({ state: 'visib le', timeout: 10_000 });
    await nombreInpu t.fill(nombre);
    await this.page.waitForTi meout(300); // allow React state update

     // Fill in the phone number — exact aria-la bel to avoid ambiguity
    const telInput = t his.page.locator('[aria-label="Tel\u00e9fono  del proveedor"]');
    if (await telInput.isV isible().catch(() => false)) {
      await te lInput.fill(telefono);
      await this.page. waitForTimeout(200);
    }

    // Click "✓  Guardar" — unique on page since main form  uses "Agregar al inventario".
    // Button i s now type="button" + onClick (no form submit  side effects).
    const guardarBtn = this.p age.getByRole('button', { name: /✓\s*Guarda r/i });
    await guardarBtn.waitFor({ state:  'visible', timeout: 10_000 });
    await gua rdarBtn.click();

    // Wait for the proveed or form to close — confirms save was trigge red
    await nombreInput.waitFor({ state: 'h idden', timeout: 10_000 }).catch(() => {});
     await this.page.waitForTimeout(2000); // a llow Supabase save to complete

    // Poll u ntil the new proveedor appears in the select  — confirms React re-render complete
    awa it this.page.waitForFunction(
      (nombre:  string) => {
        const selects = Array.fr om(document.querySelectorAll('select'));
         return selects.some(sel =>
          Arra y.from(sel.options).some(opt => opt.text.incl udes(nombre))
        );
      },
      nombr e,
      { timeout: 15_000 }
    ).catch(() = > {
      // If not found after 15s, continue  — test assertion will catch it
    });
  } 
} 