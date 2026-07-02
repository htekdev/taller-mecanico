'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Cliente, Vehiculo, Refaccion, Trabajo, Proveedor, OrdenCompra, Factura,
  Pago, PagoCompra, PagoFactura, FacturaConcepto, CompatibilidadVehiculo, PagoServicioExterno,
  Gasto,
} from '@/app/types';
import {
  generarNumeroFactura, generarNumeroOrden,
  getEstadoPagoFactura, getSaldoFactura, getSaldo,
  getEstadoPagoOrden,
} from '@/app/lib/utils';
import { Card } from '@/app/components/ui';
import { VistaClientes } from '@/app/modules/clientes';
import { VistaInventario } from '@/app/modules/inventario';
import { VistaTrabajo } from '@/app/modules/trabajos';
import { VistaProveedores } from '@/app/modules/proveedores';
import { VistaOrdenesCompra } from '@/app/modules/ordenes';
import { VistaFacturas } from '@/app/modules/facturas';
import { VistaCuentas, VistaCuentasPorPagar } from '@/app/modules/cuentas';
import { VistaResumen } from '@/app/modules/resumen';
import { VistaHistorial } from '@/app/modules/historial';
import { VistaConfiguracion } from '@/app/modules/configuracion';
import { VistaCotizaciones } from '@/app/modules/cotizaciones';
import type { ConversionTrabajo } from '@/app/modules/cotizaciones';
import { VistaGastos } from '@/app/modules/gastos';
import { useAuth }      from '@/app/context/auth';
import * as db          from '@/app/lib/db';

type Vista = 'clientes'|'inventario'|'trabajos'|'proveedores'|'ordenes'|'facturas'|'cuentas'|'pagos'|'resumen'|'historial'|'configuracion'|'cotizaciones'|'gastos';

export default function TallerMecanico() {
  const { taller, talleres, selectTaller, user, signOut } = useAuth();
  const [showTallerMenu, setShowTallerMenu] = useState(false);
  const [clientes,    setClientes]    = useState<Cliente[]>([]);
  const [vehiculos,   setVehiculos]   = useState<Vehiculo[]>([]);
  const [inventario,  setInventario]  = useState<Refaccion[]>([]);
  const [trabajos,    setTrabajos]    = useState<Trabajo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes,     setOrdenes]     = useState<OrdenCompra[]>([]);
  const [facturas,    setFacturas]    = useState<Factura[]>([]);
  const [gastos,      setGastos]      = useState<Gasto[]>([]);
  const [vista, setVista] = useState<Vista>('clientes');
  const [mesActual, setMesActual] = useState(new Date().toISOString().slice(0, 7));
  const [cargando, setCargando] = useState(true);
  const [pendingFactura, setPendingFactura] = useState<{ trabajoId: string; numero: string; fecha: string; incluirIva: boolean } | null>(null);

  // ── Cargar datos desde Supabase ──
  const cargarDatos = useCallback(async () => {
    if (!taller) return;
    setCargando(true);
    const [c, v, r, t, p, o, f, g] = await Promise.all([
      db.getClientes(taller.id),
      db.getVehiculos(taller.id),
      db.getRefacciones(taller.id),
      db.getTrabajos(taller.id),
      db.getProveedores(taller.id),
      db.getOrdenes(taller.id),
      db.getFacturas(taller.id),
      db.getGastos(taller.id),
    ]);
    setClientes(c); setVehiculos(v); setInventario(r); setTrabajos(t);
    setProveedores(p); setOrdenes(o); setFacturas(f); setGastos(g);
    setCargando(false);
  }, [taller]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Handlers ──

  const guardarCliente = async (data: Omit<Cliente, 'id'>) => {
    if (!taller) return;
    const nuevo = await db.insertCliente(taller.id, data);
    if (nuevo) setClientes(prev => [...prev, nuevo]);
  };
  const actualizarCliente = async (id: string, data: Omit<Cliente, 'id'>) => {
    const actualizado = await db.updateCliente(id, data);
    if (actualizado) setClientes(prev => prev.map(c => c.id === id ? actualizado : c));
  };
  const guardarVehiculo = async (data: Omit<Vehiculo, 'id'>) => {
    if (!taller) return;
    const nuevo = await db.insertVehiculo(taller.id, data);
    if (nuevo) setVehiculos(prev => [...prev, nuevo]);
  };

  const actualizarVehiculo = async (vehiculoId: string, data: Pick<Vehiculo, 'marca' | 'modelo' | 'anio' | 'placa'>) => {
    await db.updateVehiculo(vehiculoId, data);
    setVehiculos(prev => prev.map(v => v.id === vehiculoId ? { ...v, ...data } : v));
  };
  const guardarRefaccion = async (data: Omit<Refaccion, 'id'>) => {
    if (!taller) return;
    const nuevo = await db.insertRefaccion(taller.id, data); // throws on error
    setInventario(prev => [...prev, nuevo]);
  };
  const recibirStock = async (refaccionId: string, cantidad: number) => {
    const ref = inventario.find(r => r.id === refaccionId);
    if (!ref) return;
    const nuevoStock = ref.stock + cantidad;
    await db.updateRefaccionStock(refaccionId, nuevoStock);
    setInventario(prev => prev.map(r => r.id === refaccionId ? { ...r, stock: nuevoStock } : r));
  };
  /** Creates a new refaccion from within a PO form — used by VistaOrdenesCompra */
  const crearRefaccionDesdeOrden = async (data: Omit<Refaccion, 'id'>): Promise<Refaccion | null> => {
    if (!taller) return null;
    try {
      const nuevo = await db.insertRefaccion(taller.id, data);
      setInventario(prev => [...prev, nuevo]);
      return nuevo;
    } catch {
      return null;
    }
  };

  /** Adds a refaccion + optional PO from cotización reconciliation */
  const agregarRefaccionDesdeCotizacion = async (input: import('@/app/modules/cotizaciones').AgregarRefaccionInput): Promise<Refaccion | null> => {
    if (!taller) return null;
    const nueva = await db.insertRefaccion(taller.id, input.refaccion);
    if (!nueva) return null;
    setInventario(prev => [...prev, nueva]);
    // Create a "received" purchase order if any PO data provided
    if (input.ordenCompra) {
      const hoy = new Date().toISOString().split('T')[0];
      const piezasSubtotal = nueva.precioCompra * input.ordenCompra.cantidad;
      const orden = await db.insertOrden(taller.id, {
        proveedorId:  input.ordenCompra.proveedorId || '',
        fecha:        hoy,
        numeroOrden:  input.ordenCompra.numeroOrden,
        descripcion:  input.ordenCompra.descripcion || `Alta desde cotización — ${input.refaccion.nombre}`,
        partes: [{
          refaccionId:  nueva.id,
          nombre:       nueva.nombre,
          cantidad:     input.ordenCompra.cantidad,
          precioCompra: nueva.precioCompra,
          subtotal:     piezasSubtotal,
        }],
        subtotalSinIVA: piezasSubtotal,
        ivaAmount: 0,
        total: piezasSubtotal,
        conIVA: false,
      });
      if (orden) {
        await db.updateOrdenEstado(orden.id, 'recibida', hoy);
        setOrdenes(prev => [...prev, { ...orden, estado: 'recibida', fechaRecibida: hoy }]);
      }
    }
    return nueva;
  };

  /** Converts an approved cotización to a trabajo.
   *  Throws on failure — the modal catches this and shows an error state.
   *  Navigation to Trabajos tab is driven by the success screen button (onNavToTrabajos). */
  const convertirCotizacionATrabajo = async (data: ConversionTrabajo): Promise<void> => {
    if (!taller) throw new Error('Sin sesión activa');
    const totalManoDeObra = data.manoDeObraItems.reduce((s, l) => s + l.precio, 0);
    const totalVentaRef   = data.partes.reduce((s, p) => s + p.subtotal, 0);
    const totalCostoRef   = data.partes.reduce((s, p) => s + p.costoTotal, 0);
    const subtotal        = totalManoDeObra + totalVentaRef;

    // insertTrabajo throws on failure (see db.ts) — error bubbles to modal's catch
    await db.insertTrabajo(taller.id, {
      clienteId:                    data.clienteId,
      vehiculoId:                   data.vehiculoId,
      fecha:                        data.fecha,
      numeroOrden:                  data.cotizacionNumero,
      descripcion:                  data.descripcion,
      manoDeObra:                   totalManoDeObra,
      manoDeObraItems:              data.manoDeObraItems,
      refacciones:                  totalVentaRef,
      costoRefacciones:             totalCostoRef,
      requiereFactura:              false,
      iva:                          0,
      total:                        subtotal,
      partes:                       data.partes,
      pagos:                        [],
      estado:                       'pendiente',
      estadoFacturacion:            'sin_facturar',
      pendienteRefacciones:         data.pendienteRefacciones ?? false,
      refaccionesPendientesNombres: data.refaccionesPendientesNombres ?? [],
    });

    // Deduct stock for used parts (best-effort — non-fatal)
    if (data.partes.length > 0) {
      const updatedInv = inventario.map(r => {
        const usada = data.partes.find(p => p.refaccionId === r.id);
        return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
      });
      await db.updateRefacciones(updatedInv.filter(r => data.partes.some(p => p.refaccionId === r.id)));
      setInventario(updatedInv);
    }

    // Full authoritative reload — guarantees UI matches DB regardless of
    // whether insertTrabajo's RETURNING clause succeeded or not
    await cargarDatos();
  };
  const actualizarCompatibilidad = async (refaccionId: string, compatibilidad: CompatibilidadVehiculo[]) => {
    const compat = compatibilidad.length > 0 ? compatibilidad : undefined;
    await db.updateRefaccionCompatibilidad(refaccionId, compat ?? null);
    setInventario(prev => prev.map(r => r.id === refaccionId ? { ...r, compatibilidad: compat } : r));
  };
  const guardarTrabajo = async (data: Omit<Trabajo, 'id' | 'total' | 'iva'>) => {
    if (!taller) return;
    const subtotal = data.manoDeObra + data.refacciones;
    const iva      = data.requiereFactura ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total    = subtotal + iva;
    const nuevo = await db.insertTrabajo(taller.id, { ...data, iva, total, estadoFacturacion: 'sin_facturar' });
    if (!nuevo) return;
    // Merge client-side manoDeObraItems into the DB response to ensure tipo/costoTaller
    // fields are always present — the Supabase JSONB round-trip preserves them but this
    // guarantees the in-memory state matches exactly what was submitted by the form.
    setTrabajos(prev => [...prev, { ...nuevo, manoDeObraItems: data.manoDeObraItems }]);
    if (data.partes.length > 0) {
      const nuevoInv = inventario.map(r => {
        const usada = data.partes.find(p => p.refaccionId === r.id);
        return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
      });
      await db.updateRefacciones(nuevoInv.filter(r => data.partes.some(p => p.refaccionId === r.id)));
      setInventario(nuevoInv);
    }
  };

  const editarTrabajo = async (trabajoId: string, data: Omit<Trabajo, 'id' | 'total' | 'iva'>) => {
    const subtotal = data.manoDeObra + data.refacciones;
    const iva = data.requiereFactura ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total = subtotal + iva;
    const existing = trabajos.find(t => t.id === trabajoId);
    if (!existing) return;
    const updated = { ...existing, ...data, iva, total };
    // updateTrabajo now throws on DB error — propagates to handleSubmit's catch block
    await db.updateTrabajo(trabajoId, updated);
    setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, ...updated } : t));

    // If this job has a linked invoice, sync it with the updated costs
    if (existing.facturaId) {
      const conceptos: FacturaConcepto[] = [
        ...data.manoDeObraItems.map(m => ({ tipo: 'mano_de_obra' as const, descripcion: m.concepto, cantidad: 1, precioUnitario: m.precio, subtotal: m.precio })),
        ...data.partes.map(p => ({ tipo: 'parte' as const, descripcion: p.nombre, cantidad: p.cantidad, precioUnitario: p.precioVenta, subtotal: p.subtotal })),
      ];
      const facturaSubtotal = conceptos.reduce((s, c) => s + c.subtotal, 0);
      const facturaIva = data.requiereFactura ? Math.round(facturaSubtotal * 0.16 * 100) / 100 : 0;
      const facturaTotal = facturaSubtotal + facturaIva;
      await db.updateFacturaConceptos(existing.facturaId, {
        conceptos,
        subtotal: facturaSubtotal,
        iva: facturaIva > 0 ? facturaIva : undefined,
        total: facturaTotal,
      });
      setFacturas(prev => prev.map(f => f.id === existing.facturaId
        ? { ...f, conceptos, subtotal: facturaSubtotal, iva: facturaIva > 0 ? facturaIva : undefined, total: facturaTotal }
        : f,
      ));
    }
  };
  const registrarPago = async (trabajoId: string, pago: Omit<Pago, 'id'>) => {
    const trabajoActual = trabajos.find(t => t.id === trabajoId);
    if (!trabajoActual) return;
    const nuevoPago: Pago = { ...pago, id: Date.now().toString() };
    const nuevos = [...(trabajoActual.pagos ?? []), nuevoPago];
    // Update DB FIRST — only update local state on success to avoid phantom payments
    try {
      await db.updateTrabajoPagos(trabajoId, nuevos);
      setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, pagos: nuevos } : t));
    } catch (err) {
      console.error('[registrarPago] FAILED:', err);
      alert('No se pudo guardar el pago. Verifica tu conexión e intenta de nuevo.');
    }
  };

  const eliminarPagoTrabajo = async (trabajoId: string, pagoId: string) => {
    const trabajoActual = trabajos.find(t => t.id === trabajoId);
    if (!trabajoActual) return;
    const nuevos = (trabajoActual.pagos ?? []).filter(p => p.id !== pagoId);
    try {
      await db.updateTrabajoPagos(trabajoId, nuevos);
      setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, pagos: nuevos } : t));
    } catch (err) {
      console.error('[eliminarPagoTrabajo] FAILED:', err);
      alert('No se pudo eliminar el pago. Verifica tu conexión e intenta de nuevo.');
    }
  };

  /** Registrar pago a proveedor externo — updates the ManoDeObraItem's pagosServicio array */
  const registrarPagoServicioExterno = async (
    trabajoId: string,
    itemId: string,
    pago: Omit<PagoServicioExterno, 'id'>,
  ) => {
    const trabajo = trabajos.find(t => t.id === trabajoId);
    if (!trabajo) return;
    const nuevoPago: PagoServicioExterno = { ...pago, id: Date.now().toString() };
    const updatedItems = (trabajo.manoDeObraItems ?? []).map(item =>
      item.id === itemId
        ? { ...item, pagosServicio: [...(item.pagosServicio ?? []), nuevoPago] }
        : item
    );
    try {
      await db.updateTrabajoManoDeObraItems(trabajoId, updatedItems);
      setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, manoDeObraItems: updatedItems } : t));
    } catch (err) {
      console.error('[registrarPagoServicioExterno] FAILED:', err);
      alert('No se pudo registrar el pago al proveedor. Verifica tu conexión e intenta de nuevo.');
    }
  };
  const finalizarTrabajo = async (trabajoId: string, tipo: 'factura' | 'nota') => {
    const trabajo = trabajos.find(t => t.id === trabajoId);
    if (!trabajo) return;
    const subtotal = trabajo.manoDeObra + trabajo.refacciones;
    const iva = tipo === 'factura' ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total = subtotal + iva;
    // DB-first: save must succeed before updating local state
    try {
      await db.updateTrabajoFinalizar(trabajoId, tipo, iva, total);
      // Optimistic update — correct state is confirmed by the successful DB write above
      setTrabajos(prev => prev.map(t => t.id === trabajoId
        ? { ...t, estado: 'completado' as const, tipoDocumento: tipo, requiereFactura: tipo === 'factura', iva, total, fechaFinalizacion: new Date().toISOString() }
        : t
      ));
    } catch (err) {
      console.error('[finalizarTrabajo] FAILED:', err);
      alert('No se pudo finalizar el trabajo. Verifica tu conexión e intenta de nuevo.');
    }
  };

  const actualizarTft = async (trabajoId: string, tftNumero: string) => {
    await db.updateTrabajoTft(trabajoId, tftNumero);
    setTrabajos(prev => prev.map(t => t.id === trabajoId
      ? { ...t, tftNumero, tftEstado: 'con_tft' as const }
      : t
    ));
  };
  const guardarProveedor = async (data: Omit<Proveedor, 'id'>) => {
    if (!taller) return;
    const nuevo = await db.insertProveedor(taller.id, data);
    if (nuevo) setProveedores(prev => [...prev, nuevo]);
  };

  // ── Purchase Order handlers ──
  const crearOrden = async (data: Omit<OrdenCompra, 'id' | 'estado' | 'fechaRecibida' | 'pagos'>) => {
    if (!taller) return;
    const nueva = await db.insertOrden(taller.id, { ...data, numeroOrden: data.numeroOrden || generarNumeroOrden(ordenes) });
    if (nueva) setOrdenes(prev => [...prev, nueva]);
  };
  const recibirOrden = async (ordenId: string) => {
    if (!taller) return;
    const orden = ordenes.find(o => o.id === ordenId);
    if (!orden || orden.estado !== 'pendiente') return;
    const hoy = new Date().toISOString().split('T')[0];

    // Materialise any libre- parts that may have been added via the edit modal
    let partesFinal = [...orden.partes];
    const librePartes = partesFinal.filter(p => p.refaccionId.startsWith('libre-'));
    if (librePartes.length > 0) {
      const nuevasRefs: Refaccion[] = [];
      for (const part of librePartes) {
        const nueva = await db.insertRefaccion(taller.id, {
          nombre: part.nombre, codigo: '', categoria: '', unidad: 'pza',
          precioCompra: part.precioCompra, stock: 0, stockMinimo: 1,
        });
        if (nueva) {
          partesFinal = partesFinal.map(p => p.refaccionId === part.refaccionId ? { ...p, refaccionId: nueva.id } : p);
          nuevasRefs.push(nueva);
        }
      }
      if (nuevasRefs.length > 0) setInventario(prev => [...prev, ...nuevasRefs]);
      // Persist real IDs in the order before marking received
      const subtotal = partesFinal.reduce((s, p) => s + p.subtotal, 0);
      await db.updateOrden(ordenId, { ...orden, partes: partesFinal, subtotalSinIVA: subtotal, ivaAmount: orden.ivaAmount, total: orden.total, conIVA: orden.conIVA });
      setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, partes: partesFinal } : o));
    }

    await db.updateOrdenEstado(ordenId, 'recibida', hoy);
    setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, estado: 'recibida' as const, fechaRecibida: hoy } : o));
    if (partesFinal.length > 0) {
      const nuevoInv = inventario.map(r => {
        const item = partesFinal.find(p => p.refaccionId === r.id);
        return item ? { ...r, stock: r.stock + item.cantidad } : r;
      });
      await db.updateRefacciones(nuevoInv.filter(r => partesFinal.some(p => p.refaccionId === r.id)));
      setInventario(nuevoInv);
    }
  };
  const cancelarOrden = async (ordenId: string) => {
    await db.updateOrdenEstado(ordenId, 'cancelada');
    setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, estado: 'cancelada' as const } : o));
  };

  const editarOrden = async (
    ordenId: string,
    data: Pick<OrdenCompra, 'descripcion' | 'numeroOrden' | 'partes' | 'subtotalSinIVA' | 'ivaAmount' | 'total' | 'conIVA'>,
  ) => {
    if (!taller) return;
    const orden = ordenes.find(o => o.id === ordenId);

    // ── Materialise libre- parts into real inventory records ──────────────────
    // libre- IDs are temp placeholders for free-form parts added via the edit modal.
    // Before saving, create a real refaccion record for each and swap the ID.
    let partesFinal = [...data.partes];
    const librePartes = partesFinal.filter(p => p.refaccionId.startsWith('libre-'));
    if (librePartes.length > 0) {
      const nuevasRefs: Refaccion[] = [];
      for (const part of librePartes) {
        // For received orders the goods are already in stock; pending orders start at 0
        const stockInicial = orden?.estado === 'recibida' ? part.cantidad : 0;
        const nueva = await db.insertRefaccion(taller.id, {
          nombre: part.nombre,
          codigo: '',
          categoria: '',
          unidad: 'pza',
          precioCompra: part.precioCompra,
          stock: stockInicial,
          stockMinimo: 1,
        });
        if (nueva) {
          partesFinal = partesFinal.map(p =>
            p.refaccionId === part.refaccionId ? { ...p, refaccionId: nueva.id } : p
          );
          nuevasRefs.push(nueva);
        }
      }
      if (nuevasRefs.length > 0) setInventario(prev => [...prev, ...nuevasRefs]);
    }

    const dataFinal = { ...data, partes: partesFinal };
    await db.updateOrden(ordenId, dataFinal);
    setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, ...dataFinal } : o));

    // ── Sync nombre/precioCompra back to inventory for received orders ─────────
    if (orden?.estado === 'recibida') {
      const invUpdates: { id: string; nombre: string; precioCompra: number }[] = [];
      for (const part of dataFinal.partes) {
        const inv = inventario.find(r => r.id === part.refaccionId);
        if (!inv) continue; // newly created libre parts are already correct
        if (inv.nombre !== part.nombre || inv.precioCompra !== part.precioCompra) {
          invUpdates.push({ id: part.refaccionId, nombre: part.nombre, precioCompra: part.precioCompra });
        }
      }
      if (invUpdates.length > 0) {
        await Promise.all(
          invUpdates.map(u => db.updateRefaccionDetalles(u.id, { nombre: u.nombre, precioCompra: u.precioCompra }))
        );
        setInventario(prev => prev.map(r => {
          const upd = invUpdates.find(u => u.id === r.id);
          return upd ? { ...r, nombre: upd.nombre, precioCompra: upd.precioCompra } : r;
        }));
      }
    }
  };
  const registrarPagoOrden = async (ordenId: string, pago: Omit<PagoCompra, 'id'>) => {
    const ordenActual = ordenes.find(o => o.id === ordenId);
    if (!ordenActual) return;
    const nuevoPago: PagoCompra = { ...pago, id: Date.now().toString() };
    const nuevos = [...(ordenActual.pagos ?? []), nuevoPago];
    await db.updateOrdenPagos(ordenId, nuevos);
    setOrdenes(prev => prev.map(o => o.id === ordenId ? { ...o, pagos: nuevos } : o));
  };

  // ── Invoice (Factura) handlers ──
  const generarFactura = async (trabajoId: string, numeroFactura: string, fechaFactura: string, incluirIva: boolean) => {
    if (!taller) return;
    const trabajo = trabajos.find(t => t.id === trabajoId);
    if (!trabajo || trabajo.facturaId) return;
    const conceptos: FacturaConcepto[] = [
      ...trabajo.manoDeObraItems.map(m => ({ tipo: 'mano_de_obra' as const, descripcion: m.concepto, cantidad: 1, precioUnitario: m.precio, subtotal: m.precio })),
      ...trabajo.partes.map(p => ({ tipo: 'parte' as const, descripcion: p.nombre, cantidad: p.cantidad, precioUnitario: p.precioVenta, subtotal: p.subtotal })),
    ];
    const subtotal = conceptos.reduce((s, c) => s + c.subtotal, 0);
    // IVA is now explicit: controlled by the checkbox in the modal (incluirIva param).
    const iva = incluirIva ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total = subtotal + iva;
    const nuevaFactura = await db.insertFactura(taller.id, {
      numeroFactura,
      trabajoId, clienteId: trabajo.clienteId, vehiculoId: trabajo.vehiculoId,
      fecha: fechaFactura,
      conceptos, subtotal, iva: iva > 0 ? iva : undefined, total, pagos: [],
    });
    if (!nuevaFactura) return;
    setFacturas(prev => [...prev, nuevaFactura]);
    await db.updateTrabajoFactura(trabajoId, nuevaFactura.id);
    setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, facturaId: nuevaFactura.id, estadoFacturacion: 'facturado' as const } : t));
  };

  const abrirModalFactura = (trabajoId: string) => {
    const sugerido = generarNumeroFactura(facturas);
    const hoy = new Date().toISOString().split('T')[0];
    const trabajo = trabajos.find(t => t.id === trabajoId);
    // Default IVA checkbox: true if job was finalized as Factura or has requiereFactura=true (covers migrated data)
    const defaultIva = trabajo?.tipoDocumento === 'factura' || (trabajo?.tipoDocumento == null && trabajo?.requiereFactura === true);
    setPendingFactura({ trabajoId, numero: sugerido, fecha: hoy, incluirIva: defaultIva ?? false });
  };

  const refacturarTrabajo = async (trabajoId: string) => {
    await db.resetFacturacionTrabajo(trabajoId);
    setTrabajos(prev => prev.map(t =>
      t.id === trabajoId ? { ...t, facturaId: undefined, estadoFacturacion: 'sin_facturar' as const } : t,
    ));
  };

  const cancelarTrabajo = async (trabajoId: string) => {
    await db.cancelarTrabajo(trabajoId);
    setTrabajos(prev => prev.map(t =>
      t.id === trabajoId ? { ...t, folioFiscal: '__CANCELADA__' } : t,
    ));
  };

  const reactivarTrabajo = async (trabajoId: string) => {
    await db.reactivarTrabajo(trabajoId);
    setTrabajos(prev => prev.map(t =>
      t.id === trabajoId ? { ...t, folioFiscal: undefined } : t,
    ));
  };

  const confirmarFactura = async () => {
    if (!pendingFactura || !pendingFactura.numero.trim()) return;
    await generarFactura(pendingFactura.trabajoId, pendingFactura.numero.trim(), pendingFactura.fecha, pendingFactura.incluirIva);
    setPendingFactura(null);
    setVista('facturas');
  };
  const registrarPagoFactura = async (facturaId: string, pago: Omit<PagoFactura, 'id'>) => {
    const facturaActual = facturas.find(f => f.id === facturaId);
    if (!facturaActual) return;
    const nuevoPago: PagoFactura = { ...pago, id: Date.now().toString() };
    const nuevos = [...(facturaActual.pagos ?? []), nuevoPago];
    await db.updateFacturaPagos(facturaId, nuevos);
    setFacturas(prev => prev.map(f => f.id === facturaId ? { ...f, pagos: nuevos } : f));
  };

  const eliminarPagoFactura = async (facturaId: string, pagoId: string) => {
    const facturaActual = facturas.find(f => f.id === facturaId);
    if (!facturaActual) return;
    const nuevos = (facturaActual.pagos ?? []).filter(p => p.id !== pagoId);
    await db.updateFacturaPagos(facturaId, nuevos);
    setFacturas(prev => prev.map(f => f.id === facturaId ? { ...f, pagos: nuevos } : f));
  };

  const editarFechaFactura = async (facturaId: string, fecha: string) => {
    await db.updateFacturaFecha(facturaId, fecha);
    setFacturas(prev => prev.map(f => f.id === facturaId ? { ...f, fecha } : f));
  };

  const editarNumeroFactura = async (facturaId: string, numeroFactura: string) => {
    await db.updateFacturaNumero(facturaId, numeroFactura);
    setFacturas(prev => prev.map(f => f.id === facturaId ? { ...f, numeroFactura } : f));
  };

  const editarSubtotalFactura = async (
    facturaId: string,
    subtotal: number,
    incluirIva: boolean,
    nuevoNumero: string,
  ) => {
    const iva = incluirIva ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total = subtotal + iva;
    await db.updateFacturaTotales(facturaId, { subtotal, iva: iva > 0 ? iva : undefined, total, numeroFactura: nuevoNumero });
    setFacturas(prev => prev.map(f => f.id === facturaId ? { ...f, subtotal, iva: iva > 0 ? iva : undefined, total, numeroFactura: nuevoNumero } : f));
    // Sync back to the linked trabajo
    const factura = facturas.find(f => f.id === facturaId);
    if (factura?.trabajoId) {
      await db.updateTrabajoTotales(factura.trabajoId, { iva, total });
      setTrabajos(prev => prev.map(t => t.id === factura.trabajoId ? { ...t, iva, total } : t));
    }
  };

  const cancelarFactura = async (facturaId: string) => {
    await db.cancelarFactura(facturaId);
    setFacturas(prev => prev.map(f => f.id === facturaId ? { ...f, notas: 'CANCELADA' } : f));
  };

  const reactivarFactura = async (facturaId: string) => {
    await db.reactivarFactura(facturaId);
    setFacturas(prev => prev.map(f => f.id === facturaId ? { ...f, notas: undefined } : f));
  };

  const cancelarNota = async (trabajoId: string) => {
    await db.cancelarNota(trabajoId);
    setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, folioFiscal: '__CANCELADA__' } : t));
  };

  const reactivarNota = async (trabajoId: string) => {
    await db.reactivarNota(trabajoId);
    setTrabajos(prev => prev.map(t => t.id === trabajoId ? { ...t, folioFiscal: undefined } : t));
  };

  // ── Gastos handlers ──
  const crearGasto = async (data: Omit<Gasto, 'id' | 'tallerId'>) => {
    if (!taller) return;
    const nuevo = await db.insertGasto(taller.id, data);
    if (nuevo) setGastos(prev => [nuevo, ...prev]);
  };
  const editarGasto = async (id: string, data: Partial<Omit<Gasto, 'id' | 'tallerId'>>) => {
    await db.updateGasto(id, data);
    setGastos(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
  };
  const eliminarGasto = async (id: string) => {
    await db.deleteGasto(id);
    setGastos(prev => prev.filter(g => g.id !== id));
  };

  const calcularResumen = () => {
    const mes = trabajos.filter(t => t.fecha.startsWith(mesActual));
    const facturadoMes       = mes.reduce((s, t) => s + t.total, 0);
    const totalVentaRef      = mes.reduce((s, t) => s + t.refacciones, 0);
    const totalCostoRef      = mes.reduce((s, t) => s + (t.costoRefacciones ?? t.refacciones), 0);
    const totalManoObra      = mes.reduce((s, t) => s + t.manoDeObra, 0);
    const margenRef          = totalVentaRef - totalCostoRef;
    const ganancia           = totalManoObra + margenRef;

    // ── Servicios externos — costo real al taller (mano de obra externa) ──
    const costoServiciosExternos = mes.reduce((s, t) =>
      s + (t.manoDeObraItems ?? [])
        .filter(m => m.tipo === 'externo')
        .reduce((s2, m) => s2 + (m.costoTaller ?? 0), 0), 0);

    // ── P&L: Estado de Resultados ──
    // Ingresos = lo facturado al cliente (sin IVA for P&L purposes)
    const totalIVA      = mes.filter(t => t.requiereFactura).reduce((s, t) => s + (t.iva ?? 0), 0);
    const ingresoNeto   = facturadoMes - totalIVA;  // revenue ex-IVA
    const totalCostos   = totalCostoRef + costoServiciosExternos;
    const utilidadBruta = ingresoNeto - totalCostos;
    const pctUtilidadBruta = ingresoNeto > 0 ? Math.round((utilidadBruta / ingresoNeto) * 100) : 0;
    // Gastos operativos: real data from gastos module
    const gastosMes = gastos.filter(g => g.fecha.startsWith(mesActual));
    const gastosOperativos = gastosMes.reduce((s, g) => s + g.monto, 0);

    // ── Gastos por categoría (para el Estado de Resultados) ──
    const gastosPorCategoria = (
      ['operativo', 'administrativo', 'impuesto', 'nomina'] as const
    ).map(cat => ({
      categoria: cat,
      label: cat === 'operativo' ? 'Operativos' : cat === 'administrativo' ? 'Administrativos' : cat === 'impuesto' ? 'Impuestos' : 'Nómina',
      emoji: cat === 'operativo' ? '🏠' : cat === 'administrativo' ? '🌐' : cat === 'impuesto' ? '🧾' : '👷',
      total: gastosMes.filter(g => g.categoria === cat).reduce((s, g) => s + g.monto, 0),
    }));
    const utilidadNeta   = utilidadBruta - gastosOperativos;
    const pctUtilidadNeta = ingresoNeto > 0 ? Math.round((utilidadNeta / ingresoNeto) * 100) : 0;

    const cobradoEnMes = facturas.reduce((s, f) =>
      s + (f.pagos ?? []).filter(p => p.fecha.startsWith(mesActual)).reduce((s2, p) => s2 + p.monto, 0), 0)
      // also count direct payments on legacy trabajos
      + trabajos.filter(t => !t.facturaId).reduce((s, t) =>
          s + (t.pagos ?? []).filter(p => p.fecha.startsWith(mesActual)).reduce((s2, p) => s2 + p.monto, 0), 0);

    const pctCobrado = facturadoMes > 0 ? Math.min(cobradoEnMes / facturadoMes, 1) : 0;
    const gananciaCobrada = Math.round(ganancia * pctCobrado * 100) / 100;
    const porCobrarDelMes = facturas.filter(f => {
      const t = trabajos.find(t => t.id === f.trabajoId);
      return t?.fecha.startsWith(mesActual);
    }).reduce((s, f) => s + getSaldoFactura(f), 0);
    const pendientePorCobrar =
      facturas.filter(f => { const t = trabajos.find(t => t.id === f.trabajoId); return t?.fecha.startsWith(mesActual); })
        .reduce((s, f) => s + getSaldoFactura(f), 0)
      + trabajos.filter(t => t.fecha.startsWith(mesActual) && !t.facturaId).reduce((s, t) => s + getSaldo(t), 0);
    const ordenesMes    = ordenes.filter(o => o.fecha.startsWith(mesActual) && o.estado !== 'cancelada');
    const totalOrdenes  = ordenesMes.reduce((s, o) => s + o.total, 0);
    const porPagarOrdenes = ordenesMes.filter(o => o.estado === 'recibida').reduce((s, o) => s + (o.total - (o.pagos ?? []).reduce((s2, p) => s2 + p.monto, 0)), 0);
    const pagadoAProveedoresMes = ordenesMes.reduce((s, o) => s + (o.pagos ?? []).reduce((s2, p) => s2 + p.monto, 0), 0);
    const porPagarTotal = ordenes.filter(o => o.estado === 'recibida').reduce((s, o) => s + (o.total - (o.pagos ?? []).reduce((s2, p) => s2 + p.monto, 0)), 0);
    const mesConIVA    = mes.filter(t => t.requiereFactura);
    const mesSinIVA    = mes.filter(t => !t.requiereFactura);
    const ingresoConIVA = mesConIVA.reduce((s, t) => s + t.total, 0);
    const ingresoSinIVA = mesSinIVA.reduce((s, t) => s + t.total, 0);

    // ── Top Clientes del mes ──
    const revenueMap = new Map<string, number>();
    mes.forEach(t => revenueMap.set(t.clienteId, (revenueMap.get(t.clienteId) ?? 0) + t.total));
    const topClientes = [...revenueMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([clienteId, total]) => ({
        nombre: clientes.find(c => c.id === clienteId)?.nombre ?? '—',
        total,
      }));

    return {
      facturadoMes, ingresoNeto, totalVentaRef, totalCostoRef, margenRef, totalManoObra,
      costoServiciosExternos, totalCostos,
      utilidadBruta, pctUtilidadBruta,
      gastosOperativos, gastosPorCategoria, utilidadNeta, pctUtilidadNeta,
      ganancia, cantidad: mes.length, cobradoEnMes, porCobrarDelMes,
      totalOrdenes, porPagarOrdenes, gananciaCobrada, pendientePorCobrar,
      totalIVA, ingresoConIVA, ingresoSinIVA,
      pagadoAProveedoresMes, porPagarTotal, topClientes,
    };
  };

  const stockBajo              = inventario.filter(r => r.stock <= r.stockMinimo).length;
  const facturasPendientes     = facturas.filter(f => getEstadoPagoFactura(f) !== 'pagado').length;
  const ordenesPendientesPago  = ordenes.filter(o => o.estado === 'recibida' && getEstadoPagoOrden(o) !== 'pagado').length;
  const ordenesPendientesRecibir = ordenes.filter(o => o.estado === 'pendiente').length;
  const trabajosPendientesCt   = trabajos.filter(t => t.estado === 'pendiente').length;
  const trabajosPendientesFacturar = trabajos.filter(t => t.tipoDocumento !== 'nota' && t.estadoFacturacion !== 'facturado').length;

  const tabs = [
    { key: 'clientes',    icon: '👥', label: 'Clientes',         count: clientes.length },
    { key: 'inventario',  icon: '📦', label: 'Inventario',        count: stockBajo > 0 ? `⚠ ${stockBajo}` : inventario.length > 0 ? inventario.length : null },
    { key: 'trabajos',    icon: '🔧', label: 'Trabajos',          count: trabajosPendientesCt > 0 ? `🕐 ${trabajosPendientesCt}` : trabajos.length > 0 ? trabajos.length : null },
    { key: 'proveedores', icon: '🏪', label: 'Proveedores',       count: proveedores.length > 0 ? proveedores.length : null },
    { key: 'ordenes',     icon: '📋', label: 'Órdenes de Compra', count: ordenesPendientesRecibir > 0 ? ordenesPendientesRecibir : ordenes.length > 0 ? ordenes.length : null },
    { key: 'facturas',    icon: '🧾', label: 'Facturas',          count: facturas.length > 0 ? facturas.length : null },
    { key: 'cuentas',     icon: '💰', label: 'Por Cobrar',        count: facturasPendientes > 0 ? facturasPendientes : null },
    { key: 'pagos',       icon: '🔴', label: 'Por Pagar',         count: ordenesPendientesPago > 0 ? ordenesPendientesPago : null },
    { key: 'resumen',       icon: '📊', label: 'Resumen',           count: null },
    { key: 'gastos',        icon: '💸', label: 'Gastos',            count: gastos.filter(g => g.fecha.startsWith(mesActual)).length > 0 ? gastos.filter(g => g.fecha.startsWith(mesActual)).length : null },
    { key: 'historial',     icon: '📋', label: 'Historial',          count: null },
    { key: 'cotizaciones',  icon: '📄', label: 'Cotizaciones',       count: null },
    { key: 'configuracion', icon: '⚙️', label: 'Configuración',     count: null },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0">🔧</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white tracking-tight">Taller Mecánico</h1>

            {/* Taller name — clickable dropdown when user has multiple talleres */}
            {talleres.length > 1 ? (
              <div className="relative">
                <button
                  onClick={() => setShowTallerMenu(v => !v)}
                  className="flex items-center gap-1.5 text-slate-300 text-sm font-medium hover:text-white transition-colors group"
                >
                  <span className="truncate max-w-[160px]">{taller?.nombre ?? 'Seleccionar taller'}</span>
                  <span className="text-slate-500 group-hover:text-slate-300 text-xs">▼</span>
                </button>

                {showTallerMenu && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setShowTallerMenu(false)} />
                    {/* Dropdown */}
                    <div className="absolute left-0 top-full mt-2 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[220px]">
                      <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Cambiar taller</p>
                      {talleres.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { selectTaller(t.id); setShowTallerMenu(false); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                            t.id === taller?.id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <span className="text-lg">🔧</span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${t.id === taller?.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                              {t.nombre}
                            </div>
                            <div className="text-xs text-slate-400">
                              {t.role === 'owner' ? '🏠 Dueño' : '🔧 Mecánico'}
                            </div>
                          </div>
                          {t.id === taller?.id && <span className="text-indigo-500 text-sm">✓</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-sm font-medium truncate">{taller?.nombre ?? 'Sistema de Gestión'}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-slate-500 text-xs hidden sm:block truncate max-w-[8rem]">{user?.email}</span>
            <button onClick={signOut}
              className="text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <nav className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-slate-200 overflow-x-auto">
          {tabs.map(({ key, icon, label, count }) => (
            <button key={key} onClick={() => setVista(key)}
              className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 whitespace-nowrap ${
                vista === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}>
              <span>{icon}</span>
              <span>{label}</span>
              {count !== null && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  vista === key ? 'bg-indigo-400 text-white'
                    : (typeof count === 'string' && count.startsWith('⚠')) ? 'bg-rose-100 text-rose-600'
                    : (typeof count === 'string' && count.startsWith('🕐')) ? 'bg-amber-100 text-amber-700'
                    : (key === 'cuentas' && facturasPendientes > 0) || (key === 'pagos' && ordenesPendientesPago > 0) || (key === 'ordenes' && ordenesPendientesRecibir > 0) ? 'bg-rose-100 text-rose-600'
                    : 'bg-slate-200 text-slate-600'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </nav>

        {cargando ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-slate-400 text-sm">Cargando datos del taller...</div>
          </div>
        ) : (
        <Card className="p-6 sm:p-8">
          {vista === 'clientes' && (
            <VistaClientes clientes={clientes} vehiculos={vehiculos}
              onGuardarCliente={guardarCliente} onGuardarVehiculo={guardarVehiculo}
              onActualizarCliente={actualizarCliente} onActualizarVehiculo={actualizarVehiculo} />
          )}
          {vista === 'inventario' && (
            <VistaInventario inventario={inventario} clientes={clientes} vehiculos={vehiculos}
              proveedores={proveedores}
              onGuardarRefaccion={guardarRefaccion} onRecibirStock={recibirStock}
              onActualizarCompatibilidad={actualizarCompatibilidad} />
          )}
          {vista === 'trabajos' && (
            <VistaTrabajo clientes={clientes} vehiculos={vehiculos} inventario={inventario}
              trabajos={trabajos} facturas={facturas} proveedores={proveedores}
              onGuardar={guardarTrabajo}
              onEditar={editarTrabajo}
              onFinalizar={finalizarTrabajo}
              onIrAInventario={() => setVista('inventario')}
              onGenerarFactura={abrirModalFactura}
              onRefacturar={refacturarTrabajo}
              onCancelarTrabajo={cancelarTrabajo}
              onReactivarTrabajo={reactivarTrabajo}
              onActualizarTft={actualizarTft}
              onIrAFacturas={() => setVista('facturas')} />
          )}
          {vista === 'proveedores' && (
            <VistaProveedores proveedores={proveedores} inventario={inventario}
              onGuardarProveedor={guardarProveedor} />
          )}
          {vista === 'ordenes' && (
            <VistaOrdenesCompra ordenes={ordenes} proveedores={proveedores} inventario={inventario}
              onCrearOrden={crearOrden} onRecibirOrden={recibirOrden} onCancelarOrden={cancelarOrden}
              onEditarOrden={editarOrden}
              onIrAProveedores={() => setVista('proveedores')}
              onCrearRefaccionNueva={crearRefaccionDesdeOrden} />
          )}
          {vista === 'facturas' && (
            <VistaFacturas facturas={facturas} clientes={clientes} vehiculos={vehiculos} trabajos={trabajos}
              onRegistrarPago={registrarPagoFactura} onEditarFechaFactura={editarFechaFactura}
              onEditarNumeroFactura={editarNumeroFactura}
              onEditarSubtotalFactura={editarSubtotalFactura}
              onCancelarFactura={cancelarFactura} onReactivarFactura={reactivarFactura} />
          )}
          {vista === 'cuentas' && (
            <VistaCuentas facturas={facturas} trabajos={trabajos} clientes={clientes} vehiculos={vehiculos}
              onRegistrarPagoFactura={registrarPagoFactura}
              onRegistrarPagoTrabajo={registrarPago}
              onEliminarPagoFactura={eliminarPagoFactura}
              onEliminarPagoTrabajo={eliminarPagoTrabajo}
              onCancelarFactura={cancelarFactura} onReactivarFactura={reactivarFactura}
              onCancelarNota={cancelarNota} onReactivarNota={reactivarNota} />
          )}
          {vista === 'pagos' && (
            <VistaCuentasPorPagar ordenes={ordenes} proveedores={proveedores}
              trabajos={trabajos} clientes={clientes} vehiculos={vehiculos}
              onRegistrarPago={registrarPagoOrden}
              onIrAOrdenes={() => setVista('ordenes')}
              onPagarServicioExterno={registrarPagoServicioExterno} />
          )}
          {vista === 'resumen' && (
            <VistaResumen mesActual={mesActual} setMesActual={setMesActual}
              resumen={calcularResumen()}
              trabajos={trabajos.filter(t => t.fecha.startsWith(mesActual))}
              clientes={clientes} vehiculos={vehiculos} />
          )}
          {vista === 'gastos' && (
            <VistaGastos
              gastos={gastos}
              mesActual={mesActual}
              onCrear={crearGasto}
              onEditar={editarGasto}
              onEliminar={eliminarGasto}
            />
          )}
          {vista === 'historial' && (
            <VistaHistorial clientes={clientes} vehiculos={vehiculos} trabajos={trabajos} />
          )}
          {vista === 'cotizaciones' && (
            <VistaCotizaciones
              tallerId={taller?.id ?? ''}
              clientes={clientes}
              vehiculos={vehiculos}
              inventario={inventario}
              proveedores={proveedores}
              onConvertirATrabajo={convertirCotizacionATrabajo}
              onAgregarRefaccion={agregarRefaccionDesdeCotizacion}
              onNavToTrabajos={() => setVista('trabajos')}
            />
          )}
          {vista === 'configuracion' && (
            <VistaConfiguracion />
          )}
        </Card>
        )}
      </div>

      {/* ── Modal: Número de Factura ── */}
      {pendingFactura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">🧾 Número de Factura</h2>
            <p className="text-sm text-slate-500 mb-4">
              Escribe el número de factura que manejan en el taller. Puedes usar la sugerencia o escribir el tuyo propio.
            </p>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Número de factura
            </label>
            <input
              type="text"
              autoFocus
              value={pendingFactura.numero}
              onChange={e => {
                const num = e.target.value;
                // Auto-detect IVA from prefix: "SF" = sin factura (no IVA), "A" = factura fiscal (con IVA)
                const upperNum = num.trim().toUpperCase();
                let incluirIva = pendingFactura.incluirIva;
                if (upperNum.startsWith('SF')) incluirIva = false;
                else if (upperNum.startsWith('A')) incluirIva = true;
                setPendingFactura(prev => prev ? { ...prev, numero: num, incluirIva } : null);
              }}
              onKeyDown={e => { if (e.key === 'Enter') confirmarFactura(); if (e.key === 'Escape') setPendingFactura(null); }}
              placeholder="A-001 = con IVA · SF-001 = sin IVA"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-1"
            />
            <p className="text-xs text-slate-400 mb-4">
              💡 El IVA se ajusta automáticamente según el prefijo: <span className="font-mono font-semibold">A</span> = con IVA · <span className="font-mono font-semibold">SF</span> = sin IVA
            </p>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Fecha de factura
            </label>
            <input
              type="date"
              value={pendingFactura.fecha}
              onChange={e => setPendingFactura(prev => prev ? { ...prev, fecha: e.target.value } : null)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
            />
            <label className="flex items-center gap-3 cursor-pointer select-none mb-5 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <input
                type="checkbox"
                checked={pendingFactura.incluirIva}
                onChange={e => setPendingFactura(prev => prev ? { ...prev, incluirIva: e.target.checked } : null)}
                className="w-4 h-4 accent-indigo-600"
              />
              <div>
                <span className="text-sm font-semibold text-slate-700">Incluir IVA (16%)</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pendingFactura.incluirIva ? '✅ Se sumará 16% de IVA al total' : '⬜ Sin IVA — cobro informal o cliente exento'}
                </p>
              </div>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingFactura(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={confirmarFactura}
                disabled={!pendingFactura.numero.trim() || !pendingFactura.fecha}
                className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ✓ Crear Factura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}