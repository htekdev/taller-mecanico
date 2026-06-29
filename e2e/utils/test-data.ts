/**
 * Test Data Factories — Taller Mecánico
 *
 * Provides unique test data generators for deterministic tests.
 */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const TestData = {
  /** Generate unique client data. */
  client(suffix?: string) {
    const id = suffix || uid();
    return {
      nombre: `E2E Cliente ${id}`,
      telefono: `555-${id.slice(0, 3)}-${id.slice(3, 7)}`,
    };
  },

  /** Generate unique part data. */
  part(suffix?: string) {
    const id = suffix || uid();
    return {
      nombre: `Refacción E2E ${id}`,
      codigo: `REF-${id.slice(0, 6).toUpperCase()}`,
      precioCompra: Math.floor(Math.random() * 500) + 50,
      stock: Math.floor(Math.random() * 20) + 1,
      stockMinimo: 2,
    };
  },

  /** Generate unique proveedor data. */
  proveedor(suffix?: string) {
    const id = suffix || uid();
    return {
      nombre: `Proveedor E2E ${id}`,
      contacto: `Contacto ${id}`,
      telefono: `999-${id.slice(0, 3)}-${id.slice(3, 7)}`,
    };
  },

  /** Generate unique trabajo description. */
  trabajoDescription(suffix?: string) {
    const id = suffix || uid();
    return `Trabajo E2E ${id} — Servicio completo`;
  },

  /** Generate unique cotización description. */
  cotizacionDescription(suffix?: string) {
    const id = suffix || uid();
    return `Cotización E2E ${id}`;
  },

  /** Generate labor item data. */
  laborItem(suffix?: string) {
    const id = suffix || uid();
    return {
      concepto: `Mano de obra ${id}`,
      precio: Math.floor(Math.random() * 2000) + 500,
    };
  },

  /** Generate expense data. */
  expense(suffix?: string) {
    const id = suffix || uid();
    return {
      concepto: `Gasto E2E ${id}`,
      monto: Math.floor(Math.random() * 5000) + 100,
      fecha: new Date().toISOString().split('T')[0],
    };
  },

  /** Generate a unique identifier for this test run. */
  uniqueId(): string {
    return uid();
  },
};
