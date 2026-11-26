import type { generarYDescargarPDF } from '../../app/modules/cotizaciones';

/** Entirely synthetic quotation; safe to include in public PDF/video evidence. */
export function quotationFixture(count = 1): Parameters<typeof generarYDescargarPDF>[1] {
  return {
    numeroCotizacion: 'COT-PRUEBA-PDF',
    clienteId: '', cliente: 'Cliente de demostración / Demo customer',
    vehiculoId: '', marca: 'Demo', modelo: 'Prueba', anio: '2026',
    placas: 'DEMO', kms: '1000', fecha: '2026-11-26',
    trabajo: 'Diagnóstico de demostración. English description: complete repair estimate.',
    observaciones: 'NOTA-FINAL: Revisión completa. Final notes: all parts and labor included.',
    incluirIVA: true, autorizadoPor: 'Autorización de prueba',
    inventario: 'DEMO-01', ordenServicio: 'OS-DEMO', departamento: 'Demostración',
    refacciones: Array.from({ length: count }, (_, i) => ({
      id: `part-${i}`, cantidad: '2', precioUnitario: '125.50',
      descripcion: `PIEZA-${String(i).padStart(3, '0')} Revisión de transmisión y reparación con descripción extendida para comprobar que se conservan todos los detalles. English wrapped description: replace and inspect the complete assembly.`,
    })),
    manoDeObra: [{
      id: 'labor-0', cantidad: '1', precioUnitario: '500',
      descripcion: 'LABOR-FINAL Instalación y verificación / Installation and verification',
    }],
  };
}
