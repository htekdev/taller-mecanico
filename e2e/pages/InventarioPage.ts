import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * InventarioPage — Manages the inventory (parts) module.
 *
 * Covers: adding parts, editing, receiving stock, filtering by
 * category/proveedor, compatibility management, search.
 */
export class InventarioPage extends BasePage {
  // ─── Section locators ──────────────────────────────────────────────────────
  readonly sectionTitle: Locator;

  // ─── Add part form ─────────────────────────────────────────────────────────
  readonly nombreInput: Locator;
  readonly codigoInput: Locator;
  readonly categoriaSelect: Locator;
  readonly unidadSelect: Locator;
  readonly precioCompraInput: Locator;
  readonly stockInput: Locator;
  readonly stockMinimoInput: Locator;
  readonly proveedorSelect: Locator;
  readonly clienteSelect: Locator;
  readonly vehiculoSelect: Locator;
  readonly agregarButton: Locator;

  // ─── Filters ───────────────────────────────────────────────────────────────
  readonly filtroProveedorSelect: Locator;
  readonly filtroCategoriaSelect: Locator;

  // ─── Inventory list ────────────────────────────────────────────────────────
  readonly inventarioList: Locator;
  readonly partRows: Locator;

  // ─── Compatibility ─────────────────────────────────────────────────────────
  readonly addCompatButton: Locator;
  readonly compatMarcaInput: Locator;
  readonly compatModeloInput: Locator;

  // ─── Stock receive ─────────────────────────────────────────────────────────
  readonly recibirStockInput: Locator;
  readonly recibirStockButton: Locator;

  constructor(page: Page) {
    super(page);
    this.sectionTitle = page.locator('h2:has-text("Inventario")');

    // Form inputs — use placeholder text matching
    this.nombreInput = page.locator('input[placeholder*="Filtro de aceite" i], input[placeholder*="nombre" i]').first();
    this.codigoInput = page.locator('input[placeholder*="codigo" i], input[placeholder*="COD" i]').first();
    this.categoriaSelect = page.locator('select:has(option:has-text("Filtros"))').first();
    this.unidadSelect = page.locator('select:has(option:has-text("pza"))').first();
    this.precioCompraInput = page.locator('input[placeholder="0.00"]').first();
    this.stockInput = page.locator('input[type="number"]').nth(1);
    this.stockMinimoInput = page.locator('input[type="number"]').nth(2);
    this.proveedorSelect = page.locator('select:has(option:has-text("Proveedor"))').first();
    this.clienteSelect = page.locator('select:has(option:has-text("Cliente"))').first();
    this.vehiculoSelect = page.locator('select:has(option:has-text("Vehiculo"))').first();
    this.agregarButton = page.getByRole('button', { name: /agregar al inventario/i });

    // Filters
    this.filtroProveedorSelect = page.locator('select:has(option:has-text("Todos los proveedores"))').first();
    this.filtroCategoriaSelect = page.locator('select:has(option:has-text("Todas las categorias"))').first();

    // List
    this.inventarioList = page.locator('.space-y-2, .divide-y').first();
    this.partRows = page.locator('.border.rounded-lg, .border.rounded-xl, [data-testid="part-row"]');

    // Compatibility
    this.addCompatButton = page.getByRole('button', { name: /agregar marca|compatibilidad/i }).first();
    this.compatMarcaInput = page.locator('input[placeholder*="marca" i]').first();
    this.compatModeloInput = page.locator('input[placeholder*="modelo" i]').first();

    // Stock receive
    this.recibirStockInput = page.locator('input[type="number"][placeholder*="recibir" i], input[placeholder*="cantidad" i]').first();
    this.recibirStockButton = page.getByRole('button', { name: /recibir|\\+/i }).first();
  }

  async waitForPageLoad() {
    await this.sectionTitle.waitFor({ state: 'visible', timeout: 90_000 });
  }

  async addPart(data: {
    nombre: string;
    codigo?: string;
    categoria?: string;
    precioCompra?: number;
    stock?: number;
    stockMinimo?: number;
  }) {
    await this.fillInput(this.nombreInput, data.nombre);

    if (data.codigo && await this.codigoInput.isVisible().catch(() => false)) {
      await this.fillInput(this.codigoInput, data.codigo);
    }

    if (data.categoria && await this.categoriaSelect.isVisible().catch(() => false)) {
      await this.categoriaSelect.selectOption({ label: data.categoria });
    }

    // precioCompra must be > 0 or the submit button stays disabled — default $100
    // Use click+keyboard instead of fill() — React controlled number inputs don't
    // reliably pick up Playwright's fill() synthetic events on all versions.
    const precio = data.precioCompra ?? 100;
    if (await this.precioCompraInput.isVisible().catch(() => false)) {
      await this.precioCompraInput.click();
      await this.precioCompraInput.press('Control+A');
      await this.page.keyboard.type(String(precio));
      await this.page.waitForTimeout(300); // let React process the state update
    }

    if (data.stock !== undefined && await this.stockInput.isVisible().catch(() => false)) {
      await this.fillInput(this.stockInput, String(data.stock));
    }

    if (data.stockMinimo !== undefined && await this.stockMinimoInput.isVisible().catch(() => false)) {
      await this.fillInput(this.stockMinimoInput, String(data.stockMinimo));
    }

    await this.agregarButton.click();
    await this.page.waitForTimeout(2000);
  }

  async selectProveedor(index = 1) {
    if (await this.proveedorSelect.isVisible().catch(() => false)) {
      const count = await this.getOptionCount(this.proveedorSelect);
      if (count > 1) {
        await this.selectByIndex(this.proveedorSelect, Math.min(index, count - 1));
      }
    }
  }

  async filterByProveedor(proveedorName: string) {
    if (await this.filtroProveedorSelect.isVisible().catch(() => false)) {
      await this.filtroProveedorSelect.selectOption({ label: proveedorName });
      await this.page.waitForTimeout(500);
    }
  }

  async filterByCategoria(categoria: string) {
    if (await this.filtroCategoriaSelect.isVisible().catch(() => false)) {
      await this.filtroCategoriaSelect.selectOption({ label: categoria });
      await this.page.waitForTimeout(500);
    }
  }

  async getPartCount(): Promise<number> {
    return this.partRows.count();
  }

  async isPartVisible(name: string): Promise<boolean> {
    return this.page.locator(`text=${name}`).first().isVisible().catch(() => false);
  }

  async expandPart(name: string) {
    const row = this.page.locator(`text=${name}`).first();
    await row.click();
    await this.page.waitForTimeout(500);
  }

  async receiveStock(partName: string, quantity: number) {
    await this.expandPart(partName);
    const container = this.page.locator(`.border:has(text="${partName}")`).first();
    const input = container.locator('input[type="number"]').last();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(String(quantity));
      const btn = container.getByRole('button', { name: /recibir|\\+/ }).first();
      await btn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async wasAddSuccessful(partName: string): Promise<boolean> {
    await this.page.waitForTimeout(1000);
    return this.isPartVisible(partName);
  }

  async getStockCount(partName: string): Promise<string> {
    const row = this.page.locator(`:has-text("${partName}")`).first();
    const stock = row.locator('text=/\\d+ (pza|lt|kg|m)/').first();
    return this.getText(stock);
  }

  /**
   * 2-step delete: click the "🗑 Eliminar" button in the row for `name`,
   * then either confirm (true) or cancel (false) the deletion.
   *
   * The inventory table renders one row per part. After clicking "Eliminar",
   * the same row shows "✓ Confirmar" and "Cancelar" buttons.
   */
  async eliminarPieza(name: string, confirm: boolean) {
    // Find the table row that contains this part's name
    const row = this.page.locator(`tr:has-text("${name}")`).first();

    // Click the initial "🗑 Eliminar" button
    const eliminarBtn = row.getByRole('button', { name: /Eliminar/i });
    await eliminarBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await eliminarBtn.click();
    await this.page.waitForTimeout(400);

    if (confirm) {
      // Click "✓ Confirmar" to complete the deletion
      const confirmarBtn = row.getByRole('button', { name: /Confirmar/i });
      await confirmarBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await confirmarBtn.click();
      await this.page.waitForTimeout(2000);
    } else {
      // Click "Cancelar" to abort (part remains in list)
      const cancelarBtn = row.getByRole('button', { name: /^Cancelar$/i });
      await cancelarBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await cancelarBtn.click();
      await this.page.waitForTimeout(400);
    }
  }

  /**
   * Add a new proveedor via the inline form in the Inventario add-part panel.
   *
   * Clicks "+ Nuevo proveedor" to expand the form, fills in nombre and telefono,
   * then clicks "✓ Guardar" to save.
   */
  async agregarProveedorInline(nombre: string, telefono: string) {
    // Click the toggle button to reveal the inline proveedor form
    const toggleBtn = this.page.getByRole('button', { name: /\+ Nuevo proveedor/i });
    await toggleBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await toggleBtn.click();
    await this.page.waitForTimeout(500);

    // Fill in the proveedor name (aria-label="Nombre del proveedor")
    const nombreInput = this.page.locator('[aria-label="Nombre del proveedor"]');
    await nombreInput.waitFor({ state: 'visible', timeout: 10_000 });
    await nombreInput.fill(nombre);
    await this.page.waitForTimeout(300); // allow React state update

    // Fill in the phone number — exact aria-label to avoid ambiguity
    const telInput = this.page.locator('[aria-label="Tel\u00e9fono del proveedor"]');
    if (await telInput.isVisible().catch(() => false)) {
      await telInput.fill(telefono);
      await this.page.waitForTimeout(200);
    }

    // Click "✓ Guardar" — unique on page since main form uses "Agregar al inventario".
    // Button is now type="button" + onClick (no form submit side effects).
    const guardarBtn = this.page.getByRole('button', { name: /✓\s*Guardar/i });
    await guardarBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await guardarBtn.click();

    // Wait for the proveedor form to close — confirms save was triggered
    await nombreInput.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await this.page.waitForTimeout(2000); // allow Supabase save to complete

    // Poll until the new proveedor appears in the select — confirms React re-render complete
    await this.page.waitForFunction(
      (nombre: string) => {
        const selects = Array.from(document.querySelectorAll('select'));
        return selects.some(sel =>
          Array.from(sel.options).some(opt => opt.text.includes(nombre))
        );
      },
      nombre,
      { timeout: 15_000 }
    ).catch(() => {
      // If not found after 15s, continue — test assertion will catch it
    });
  }
}
