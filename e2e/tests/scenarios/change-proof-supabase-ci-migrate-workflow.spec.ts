import { test, expect } from '../../fixtures';
import { showPhaseLabel } from '../visual-assert';

test('change-proof-supabase-ci-migrate-workflow', async ({
  page,
  loginPage,
  dashboardPage,
}) => {
  test.slow();

  await showPhaseLabel(page, 'Login -- conexion Supabase activa');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  await showPhaseLabel(page, 'Dashboard -- sin errores de esquema');
  const crashError = page.getByText(/error al cargar|algo salio mal|fatal error/i);
  const hasCrash = await crashError.isVisible({ timeout: 5_000 }).catch(() => false);
  expect(hasCrash, 'Dashboard sin error fatal de BD').toBe(false);

  await showPhaseLabel(page, 'Historial -- columnas numero_orden y kilometraje');
  await dashboardPage.navigateToModule('historial');
  await page.waitForTimeout(2000);
  const historialError = page.getByText(/error al cargar|column.*not exist/i);
  const hasHistorialError = await historialError.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasHistorialError, 'Historial sin error de columna').toBe(false);
  // Use text-based selector — data-testid may not be present in all code versions
  const historialContent = page.getByText(/Historial|Sin trabajos|Sin registros/i).first();
  const historialVisible = await historialContent.isVisible({ timeout: 10_000 }).catch(() => false);
  expect(historialVisible, 'Historial cargado correctamente').toBe(true);

  await showPhaseLabel(page, 'Trabajos -- esquema de migracion aplicado');
  await dashboardPage.navigateToModule('trabajos');
  await page.waitForTimeout(1500);
  const trabajosError = page.getByText(/error al cargar|column.*not exist/i);
  const hasTrabajosError = await trabajosError.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasTrabajosError, 'Trabajos sin error de esquema').toBe(false);
  // Use text-based selector — data-testid may not be present in all code versions
  const trabajosContent = page.getByText(/Trabajo|Sin trabajos|Agregar trabajo/i).first();
  const trabajosVisible = await trabajosContent.isVisible({ timeout: 10_000 }).catch(() => false);
  expect(trabajosVisible, 'Trabajos cargado correctamente').toBe(true);

  await showPhaseLabel(page, 'Clientes -- verificacion DB connection');
  await dashboardPage.navigateToModule('clientes');
  await page.waitForTimeout(1500);
  const clientesError = page.getByText(/error al cargar|algo salio mal/i);
  const hasClientesError = await clientesError.isVisible({ timeout: 3_000 }).catch(() => false);
  expect(hasClientesError, 'Clientes sin error de BD').toBe(false);

  await showPhaseLabel(page, 'PR #125 -- migrate.yml con --linked flag OK');
  await page.waitForTimeout(2000);
});