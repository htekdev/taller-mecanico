'use client';

import { useState, useEffect } from 'react';
import type {
  Cliente,
  Vehiculo,
  Refaccion,
  TrabajoRefaccion,
  Trabajo,
  Pago,
  Proveedor,
  CompraItem,
  PagoCompra,
  Compra,
  Vista,
} from './types';
import { getSaldo, calcularResumenMensual, type ResumenMensual } from './utils';
import { getMontoPagado, getEstadoPago } from './utils';
import { getMontoPagadoCompra, getEstadoPagoCompra } from './utils';

// ─── App state returned by the hook ──────────────────────────────────────────

export interface AppData {
  // State
  clientes:   Cliente[];
  vehiculos:  Vehiculo[];
  inventario: Refaccion[];
  trabajos:   Trabajo[];
  proveedores: Proveedor[];
  compras:    Compra[];
  vista:      Vista;
  mesActual:  string;

  // Derived counts (for tab badges)
  stockBajo:             number;
  pendientesPorCobrar:   number;
  pendientesPorPagar:    number;

  // Navigation
  setVista:     (v: Vista) => void;
  setMesActual: (m: string) => void;

  // Handlers — Clientes
  guardarCliente:  (data: Omit<Cliente, 'id'>) => void;
  guardarVehiculo: (data: Omit<Vehiculo, 'id'>) => void;

  // Handlers — Inventario
  guardarRefaccion: (data: Omit<Refaccion, 'id'>) => void;
  recibirStock:     (refaccionId: string, cantidad: number) => void;

  // Handlers — Trabajos
  guardarTrabajo:  (data: Omit<Trabajo, 'id' | 'total'>) => void;
  registrarPago:   (trabajoId: string, pago: Omit<Pago, 'id'>) => void;

  // Handlers — Proveedores & Compras
  guardarProveedor:   (data: Omit<Proveedor, 'id'>) => void;
  guardarCompra:      (data: Omit<Compra, 'id'>) => void;
  registrarPagoCompra: (compraId: string, pago: Omit<PagoCompra, 'id'>) => void;

  // Resumen
  resumen: ResumenMensual;
}

// ─── The hook ─────────────────────────────────────────────────────────────────

export function useAppData(): AppData {
  const [clientes,    setClientes]    = useState<Cliente[]>([]);
  const [vehiculos,   setVehiculos]   = useState<Vehiculo[]>([]);
  const [inventario,  setInventario]  = useState<Refaccion[]>([]);
  const [trabajos,    setTrabajos]    = useState<Trabajo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [compras,     setCompras]     = useState<Compra[]>([]);
  const [vista,       setVista]       = useState<Vista>('clientes');
  const [mesActual,   setMesActual]   = useState(new Date().toISOString().slice(0, 7));

  // ── Load from localStorage with migrations ──
  useEffect(() => {
    const rawClientes    = localStorage.getItem('clientes');
    const rawVehiculos   = localStorage.getItem('vehiculos');
    const rawInventario  = localStorage.getItem('inventario');
    const rawTrabajos    = localStorage.getItem('trabajos');
    const rawProveedores = localStorage.getItem('proveedores');
    const rawCompras     = localStorage.getItem('compras');

    type ClienteViejo = Cliente & { vehiculo?: string };
    let parsedClientes: ClienteViejo[]  = rawClientes  ? JSON.parse(rawClientes)  : [];
    let parsedVehiculos: Vehiculo[]     = rawVehiculos  ? JSON.parse(rawVehiculos) : [];
    const parsedInventario: Refaccion[] = rawInventario ? JSON.parse(rawInventario) : [];

    // Migration: Cliente used to have a `vehiculo` string field
    if (parsedClientes.some(c => 'vehiculo' in c && c.vehiculo)) {
      const migrados: Vehiculo[] = [];
      parsedClientes = parsedClientes.map(({ vehiculo, ...c }) => {
        if (vehiculo) {
          migrados.push({ id: `mig_${c.id}`, clienteId: c.id, marca: vehiculo, modelo: '', anio: '', placa: '' });
        }
        return c;
      });
      parsedVehiculos = [...parsedVehiculos, ...migrados];
      localStorage.setItem('clientes',  JSON.stringify(parsedClientes));
      localStorage.setItem('vehiculos', JSON.stringify(parsedVehiculos));
    }

    // Migration: add partes, manoDeObraItems, costoRefacciones, pagos if missing
    const parsedTrabajos: Trabajo[] = (rawTrabajos ? JSON.parse(rawTrabajos) : []).map(
      (t: Trabajo & { manoDeObra: number }) => {
        const partes: TrabajoRefaccion[] = (t.partes ?? []).map(
          (p: TrabajoRefaccion & { precioUnitario?: number }) => ({
            ...p,
            precioCompra: p.precioCompra ?? p.precioUnitario ?? 0,
            precioVenta:  p.precioVenta  ?? p.precioUnitario ?? 0,
            costoTotal:   p.costoTotal   ?? p.subtotal       ?? 0,
          })
        );
        return {
          ...t,
          partes,
          manoDeObraItems: t.manoDeObraItems ?? (
            t.manoDeObra > 0
              ? [{ id: `mig_${t.id}`, concepto: 'Mano de obra', precio: t.manoDeObra }]
              : []
          ),
          costoRefacciones: t.costoRefacciones
            ?? partes.reduce((s, p) => s + p.costoTotal, 0)
            ?? t.refacciones,
          pagos: t.pagos ?? [],
        };
      }
    );

    setClientes(parsedClientes);
    setVehiculos(parsedVehiculos);
    setInventario(parsedInventario);
    setTrabajos(parsedTrabajos);
    setProveedores(rawProveedores ? JSON.parse(rawProveedores) : []);
    setCompras(rawCompras ? JSON.parse(rawCompras) : []);
  }, []);

  // ── Clientes / Vehiculos ──

  const guardarCliente = (data: Omit<Cliente, 'id'>) => {
    const nuevo: Cliente = { ...data, id: Date.now().toString() };
    const nuevos = [...clientes, nuevo];
    setClientes(nuevos);
    localStorage.setItem('clientes', JSON.stringify(nuevos));
  };

  const guardarVehiculo = (data: Omit<Vehiculo, 'id'>) => {
    const nuevo: Vehiculo = { ...data, id: Date.now().toString() };
    const nuevos = [...vehiculos, nuevo];
    setVehiculos(nuevos);
    localStorage.setItem('vehiculos', JSON.stringify(nuevos));
  };

  // ── Inventario ──

  const guardarRefaccion = (data: Omit<Refaccion, 'id'>) => {
    const nuevo: Refaccion = { ...data, id: Date.now().toString() };
    const nuevos = [...inventario, nuevo];
    setInventario(nuevos);
    localStorage.setItem('inventario', JSON.stringify(nuevos));
  };

  const recibirStock = (refaccionId: string, cantidad: number) => {
    const nuevos = inventario.map(r =>
      r.id === refaccionId ? { ...r, stock: r.stock + cantidad } : r
    );
    setInventario(nuevos);
    localStorage.setItem('inventario', JSON.stringify(nuevos));
  };

  // ── Trabajos ──

  const guardarTrabajo = (data: Omit<Trabajo, 'id' | 'total'>) => {
    const total = data.manoDeObra + data.refacciones;
    const nuevo: Trabajo = { ...data, id: Date.now().toString(), total };

    // Deduct inventory for parts used
    if (data.partes.length > 0) {
      const nuevoInv = inventario.map(r => {
        const usada = data.partes.find((p: TrabajoRefaccion) => p.refaccionId === r.id);
        return usada ? { ...r, stock: r.stock - usada.cantidad } : r;
      });
      setInventario(nuevoInv);
      localStorage.setItem('inventario', JSON.stringify(nuevoInv));
    }

    const nuevos = [...trabajos, nuevo];
    setTrabajos(nuevos);
    localStorage.setItem('trabajos', JSON.stringify(nuevos));
  };

  const registrarPago = (trabajoId: string, pago: Omit<Pago, 'id'>) => {
    const nuevoPago: Pago = { ...pago, id: Date.now().toString() };
    const nuevos = trabajos.map(t =>
      t.id === trabajoId ? { ...t, pagos: [...(t.pagos ?? []), nuevoPago] } : t
    );
    setTrabajos(nuevos);
    localStorage.setItem('trabajos', JSON.stringify(nuevos));
  };

  // ── Proveedores & Compras ──

  const guardarProveedor = (data: Omit<Proveedor, 'id'>) => {
    const nuevo: Proveedor = { ...data, id: Date.now().toString() };
    const nuevos = [...proveedores, nuevo];
    setProveedores(nuevos);
    localStorage.setItem('proveedores', JSON.stringify(nuevos));
  };

  const guardarCompra = (data: Omit<Compra, 'id'>) => {
    const nueva: Compra = { ...data, id: Date.now().toString() };
    // Increase inventory stock for each item received
    if (data.items.length > 0) {
      const nuevoInv = inventario.map(r => {
        const item = data.items.find((i: CompraItem) => i.refaccionId === r.id);
        return item ? { ...r, stock: r.stock + item.cantidad } : r;
      });
      setInventario(nuevoInv);
      localStorage.setItem('inventario', JSON.stringify(nuevoInv));
    }
    const nuevas = [...compras, nueva];
    setCompras(nuevas);
    localStorage.setItem('compras', JSON.stringify(nuevas));
  };

  const registrarPagoCompra = (compraId: string, pago: Omit<PagoCompra, 'id'>) => {
    const nuevoPago: PagoCompra = { ...pago, id: Date.now().toString() };
    const nuevas = compras.map(c =>
      c.id === compraId ? { ...c, pagos: [...(c.pagos ?? []), nuevoPago] } : c
    );
    setCompras(nuevas);
    localStorage.setItem('compras', JSON.stringify(nuevas));
  };

  // ── Derived values ──

  const stockBajo           = inventario.filter(r => r.stock <= r.stockMinimo).length;
  const pendientesPorCobrar = trabajos.filter(t => getEstadoPago(t) !== 'pagado').length;
  const pendientesPorPagar  = compras.filter(c => getEstadoPagoCompra(c) !== 'pagado').length;
  const resumen             = calcularResumenMensual(trabajos, mesActual);

  return {
    clientes, vehiculos, inventario, trabajos, proveedores, compras,
    vista, mesActual,
    stockBajo, pendientesPorCobrar, pendientesPorPagar,
    setVista, setMesActual,
    guardarCliente, guardarVehiculo,
    guardarRefaccion, recibirStock,
    guardarTrabajo, registrarPago,
    guardarProveedor, guardarCompra, registrarPagoCompra,
    resumen,
  };
}
