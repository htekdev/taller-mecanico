import { test, expect } from '../../fixtures';
import { TestData } from '../../utils/test-data';
import { showPhaseLabel } from '../visual-assert';

/**
 * change-proof-factura-pdf-upload
 * Verifies: PDF upload field exists in the factura number modal,
 * Facturas section shows factura correctly,
 * CxC has no PDF file input.
 */
test.describe.configure({ retries: 1 });

test('change-proof: PDF upload in facturado modal, visible only in Facturas', async ({
  page, loginPage, dashboardPage, trabajosPage,
}) => {
  test.slow();
  const JOB_DESC = 'Prueba PDF factura PR185 modal check';

  await showPhaseLabel(page, '→ Login');
  await loginPage.loginAsTestUser();
  await dashboardPage.waitForPageLoad();

  await dashboardPage.navigateToModule('trabajos');
  await trabajosPage.waitForPageLoad();
  await page.waitForTimeout(1500);

  const pendienteFacturaBtn = page.getByRole('button', { name: /pendiente de facturar/i }).first();
  const hasPendingFactura = await pendienteFacturaBtn.isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hasPendingFactura) {
    let vehicleFound = false;
    for (let ci = 1; ci <= 8; ci++) {
      await trabajosPage.selectClient(ci);
      await page.waitForTimeout(600);
      const vehicleSelect = trabajosPage.vehicleSelect;
      const optCount = await vehicleSelect.locator('option').count();
      if (optCount > 1) { await trabajosPage.selectVehicle(1); vehicleFound = true; break; }
    }

    if (!vehicleFound) {
      const clientData = TestData.client('factura-pdf');
      const vehicleData = {
        marca: 'Toyota',
        modelo: `Hiace ${TestData.uniqueId().slice(-4)}`,
        anio: '2020',
        placa: `PDF-${TestData.uniqueId().slice(-3).toUpperCase()}`,
      };

      await showPhaseLabel(page, '→ Crear cliente y unidad de apoyo');
      await dashboardPage.navigateToModule('clientes');
      await dashboardPage.waitForPageLoad();
      await page.waitForTimeout(1000);

      await page.locator('input[placeholder="Nombre completo"]').first().fill(clientData.nombre);
      await page.locator('input[placeholder*="555-123-4567"]').first().fill(clientData.telefono);
      await page.getByRole('button', { name: /\+ agregar cliente/i }).click();
      await page.waitForTimeout(1500);

      const clientCard = page.getByRole('button', { name: new RegExp(clientData.nombre, 'i') }).first();
      await expect(clientCard, 'Cliente de apoyo debe existir').toBeVisible({ timeout: 10_000 });
      await clientCard.click();
      await page.waitForTimeout(500);

      await page.locator('input[placeholder="Ej. Ford"]').fill(vehicleData.marca);
      await page.locator('input[placeholder="Ej. F-150"]').fill(vehicleData.modelo);
      await page.locator('input[placeholder="Ej. 2020"]').fill(vehicleData.anio);
      await page.locator('input[placeholder="Ej. ABC-123"]').fill(vehicleData.placa);
      await page.getByRole('button', { name: /^\+ agregar$/i }).last().click();
      await page.waitForTimeout(1500);

      await dashboardPage.navigateToModule('trabajos');
      await trabajosPage.waitForPageLoad();
      await page.waitForTimeout(1000);
      await trabajosPage.clientSelect.selectOption({ label: clientData.nombre });
      await page.waitForTimeout(1000);
      const optCount = await trabajosPage.vehicleSelect.locator('option').count();
      expect(optCount, 'Cliente de apoyo debe tener unidad').toBeGreaterThan(1);
      await trabajosPage.selectVehicle(1);
      vehicleFound = true;
    }

    expect(vehicleFound, 'Debe existir cliente con vehículo').toBe(true);
    await trabajosPage.fillDescription(JOB_DESC);
    await trabajosPage.addLaborItem('Chequeo', 300);
    await trabajosPage.save();
    await page.waitForTimeout(2000);

    await showPhaseLabel(page, '→ Finalizar como Factura');
    const trabajoRow = page.locator('tr').filter({ hasText: JOB_DESC }).first();
    await expect(trabajoRow, 'Trabajo recién creado debe aparecer').toBeVisible({ timeout: 10_000 });
    await trabajoRow.getByRole('button', { name: /finalizar/i }).click();
    await page.waitForTimeout(2000);
    const finalizarModal = page.locator('.fixed.inset-0').filter({ hasText: /Finalizar Trabajo/i }).first();
    const facturaBtn = finalizarModal.getByRole('button', { name: /factura/i }).first();
    if (await facturaBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await facturaBtn.click();
      await page.waitForTimeout(1500);
    }
  } else {
    await showPhaseLabel(page, '→ Usar trabajo pendiente por facturar');
    await pendienteFacturaBtn.click();
    await page.waitForTimeout(1500);
  }

  await showPhaseLabel(page, '→ Verificar modal tiene campo PDF');
  const modal = page.locator('.fixed.inset-0').filter({ hasText: /Número de Factura/i }).first();
  await expect(modal, 'Modal debe ser visible').toBeVisible({ timeout: 8_000 });
  const pdfInput = modal.locator('input[accept="application/pdf"]');
  await expect(pdfInput, 'Modal debe tener input PDF').toBeAttached({ timeout: 5_000 });

  const numeroInput = modal.locator('input[type="text"]').first();
  await numeroInput.fill('PRV2-001');
  await page.waitForTimeout(500);
  const crearBtn = modal.getByRole('button', { name: /crear factura/i });
  await crearBtn.click();
  await page.waitForTimeout(3000);

  await showPhaseLabel(page, '→ Verificar sección Facturas');
  await dashboardPage.navigateToModule('facturas');
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const facturaRow = page.locator('.border-slate-200.rounded-xl.overflow-hidden').filter({ hasText: /PRV2-001/i }).first();
  await expect(facturaRow, 'Factura PRV2-001 debe aparecer en Facturas').toBeVisible({ timeout: 10_000 });

  await showPhaseLabel(page, '→ Verificar CxC sin upload PDF');
  await dashboardPage.navigateToModule('cuentas');
  await page.waitForTimeout(2000);
  const cxcPdfInput = page.locator('input[accept="application/pdf"]');
  await expect(cxcPdfInput, 'CxC NO debe tener input PDF').not.toBeAttached();

  await showPhaseLabel(page, '✅ PR #185 verificado');
  await page.waitForTimeout(500);
});
