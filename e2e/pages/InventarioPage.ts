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
    this.codigoInput = page.locator('input[placeholder*="código" i], input[placeholder*="COD" i]').first();
    this.categoriaSelect = page.locator('select:has(option:has-text("Filtros"))').first();
    this.unidadSelect = page.locator('select:has(option:has-text("pza"))').first();
    this.precioCompraInput = page.locator('input[type="number"]').first();
    this.stockInput = page.locator('input[type="number"]').nth(1);
    this.stockMinimoInput = page.locator('input[type="number"]').nth(2);
    this.proveedorSelect = page.locator('select:has(option:has-text("Proveedor"))').first();
    this.clienteSelect = page.locator('select:has(option:has-text("Cliente"))').first();
    this.vehiculoSelect = page.locator('select:has(option:has-text("Vehículo"))').first();
    this.agregarButton = page.getByRole('button', { name: /agregar al inventario/i });

    // Filters
    this.filtroProveedorSelect = page.locator('select:has(option:has-text("Todos los proveedores"))').first();
    this.filtroCategoriaSelect = page.locator('select:has(option:has-text("Todas las categorías"))').first();

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

  /** Add a new part to inventory. */
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

    if (data.precioCompra !== undefined) {
      await this.fillInput(this.precioCompraInput, String(data.precioCompra));
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

  /** Select a proveedor for the part being added. */
  async selectProveedor(index = 1) {
    if (await this.proveedorSelect.isVisible().catch(() => false)) {
      const count = await this.getOptionCount(this.proveedorSelect);
      if (count > 1) {
        await this.selectByIndex(this.proveedorSelect, Math.min(index, count - 1));
      }
    }
  }

  /** Filter inventory by proveedor. */
  async filterByProveedor(proveedorName: string) {
    if (await this.filtroProveedorSelect.isVisible().catch(() => false)) {
      await this.filtroProveedorSelect.selectOption({ label: proveedorName });
      await this.page.waitForTimeout(500);
    }
  }

  /** Filter inventory by category. */
  async filterByCategoria(categoria: string) {
    if (await this.filtroCategoriaSelect.isVisible().catch(() => false)) {
      await this.filtroCategoriaSelect.selectOption({ label: categoria });
      await this.page.waitForTimeout(500);
    }
  }

  /** Get the count of visible parts in the list. */
  async getPartCount(): Promise<number> {
    return this.partRows.count();
  }

  /** Check if a specific part name is visible in the list. */
  async isPartVisible(name: string): Promise<boolean> {
    return this.page.locator(`text=${name}`).first().isVisible().catch(() => false);
  }

  /** Expand a part row to see details. */
  async expandPart(name: string) {
    const row = this.page.locator(`text=${name}`).first();
    await row.click();
    await this.page.waitForTimeout(500);
  }

  /** Receive stock for a part (by its visible name). */
  async receiveStock(partName: string, quantity: number) {
    await this.expandPart(partName);
    // Find the receive input near this part
    const container = this.page.locator(`.border:has(text="${partName}")`).first();
    const input = container.locator('input[type="number"]').last();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(String(quantity));
      const btn = container.getByRole('button', { name: /recibir|\\+/ }).first();
      await btn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /** Check if the "Agregar" was successful (part appears in list). */
  async wasAddSuccessful(partName: string): Promise<boolean> {
    await this.page.waitForTimeout(1000);
    return this.isPartVisible(partName);
  }

  /** Get the stock count displayed for a specific part. */
  async getStockCount(partName: string): Promise<string> {
    const row = this.page.locator(`:has-text("${partName}")`).first();
    const stock = row.locator('text=/\\d+ (pza|lt|kg|m)/').first();
    return this.getText(stock);
  }
}
