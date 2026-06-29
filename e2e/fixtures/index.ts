import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { CotizacionesPage } from '../pages/CotizacionesPage';
import { TrabajosPage } from '../pages/TrabajosPage';
import { InventarioPage } from '../pages/InventarioPage';
import { CuentasCobrarPage } from '../pages/CuentasCobrarPage';
import { OrdenesCompraPage } from '../pages/OrdenesCompraPage';
import { ProveedoresPage } from '../pages/ProveedoresPage';
import { GastosPage } from '../pages/GastosPage';
import { Sidebar } from '../pages/components/Sidebar';
import { DataTable } from '../pages/components/DataTable';
import { FormDialog } from '../pages/components/FormDialog';
import { ClientSelector } from '../pages/components/ClientSelector';

/**
 * Custom test fixture that provides all Page Objects pre-instantiated.
 *
 * Usage in specs:
 *   import { test, expect } from '../fixtures';
 *   test('my test', async ({ loginPage, dashboardPage, cotizacionesPage }) => { ... });
 */

type AppFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  cotizacionesPage: CotizacionesPage;
  trabajosPage: TrabajosPage;
  inventarioPage: InventarioPage;
  cuentasCobrarPage: CuentasCobrarPage;
  ordenesCompraPage: OrdenesCompraPage;
  proveedoresPage: ProveedoresPage;
  gastosPage: GastosPage;
  sidebar: Sidebar;
  dataTable: DataTable;
  formDialog: FormDialog;
  clientSelector: ClientSelector;
};

export const test = base.extend<AppFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  cotizacionesPage: async ({ page }, use) => {
    await use(new CotizacionesPage(page));
  },
  trabajosPage: async ({ page }, use) => {
    await use(new TrabajosPage(page));
  },
  inventarioPage: async ({ page }, use) => {
    await use(new InventarioPage(page));
  },
  cuentasCobrarPage: async ({ page }, use) => {
    await use(new CuentasCobrarPage(page));
  },
  ordenesCompraPage: async ({ page }, use) => {
    await use(new OrdenesCompraPage(page));
  },
  proveedoresPage: async ({ page }, use) => {
    await use(new ProveedoresPage(page));
  },
  gastosPage: async ({ page }, use) => {
    await use(new GastosPage(page));
  },
  sidebar: async ({ page }, use) => {
    await use(new Sidebar(page));
  },
  dataTable: async ({ page }, use) => {
    await use(new DataTable(page));
  },
  formDialog: async ({ page }, use) => {
    await use(new FormDialog(page));
  },
  clientSelector: async ({ page }, use) => {
    await use(new ClientSelector(page));
  },
});

export { expect };
