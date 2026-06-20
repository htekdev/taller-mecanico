'use client';

import { useEffect, useState } from 'react';
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
  OrdenCompra,
  Factura,
  PagoFactura,
  Vista,
} from './types';
import {
  calcularResumenMensual,
  generarNumeroFactura,
  generarNumeroOrden,
  getEstadoPago,
  getEstadoPagoOrden,
  type ResumenMensual,
} from './utils';

export interface AppData {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  inventario: Refaccion[];
  trabajos: Trabajo[];
  proveedores: Proveedor[];
  ordenes: OrdenCompra[];
  facturas: Factura[];
  vista: Vista;
  mesActual: string;
  stockBajo: number;
  pendientesPorCobrar: number;
  pendientesPorPagar: number;
  setVista: (v: Vista) => void;
  setMesActual: (m: string) => void;
  guardarCliente: (data: Omit<Cliente, 'id'>) => void;
  guardarVehiculo: (data: Omit<Vehiculo, 'id'>) => void;
  guardarRefaccion: (data: Omit<Refaccion, 'id'>) => void;
  recibirStock: (refaccionId: string, cantidad: number) => void;
  guardarTrabajo: (data: Omit<Trabajo, 'id' | 'total' | 'iva'>) => void;
  registrarPago: (trabajoId: string, pago: Omit<Pago, 'id'>) => void;
  guardarProveedor: (data: Omit<Proveedor, 'id'>) => void;
  guardarOrden: (data: Omit<OrdenCompra, 'id'>) => void;
  recibirOrden: (ordenId: string) => void;
  registrarPagoOrden: (ordenId: string, pago: Omit<PagoCompra, 'id'>) => void;
  guardarFactura: (data: Omit<Factura, 'id' | 'numeroFactura'>) => void;
  registrarPagoFactura: (facturaId: string, pago: Omit<PagoFactura, 'id'>) => void;
  resumen: ResumenMensual;
}

export function useAppData(): AppData {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [inventario, setInventario] = useState<Refaccion[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [vista, setVista] = useState<Vista>('clientes');
  const [mesActual, setMesActual] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const rawClientes = localStorage.getItem('clientes');
    const rawVehiculos = localStorage.getItem('vehiculos');
    const rawInventario = localStorage.getItem('inventario');
    const rawTrabajos = localStorage.getItem('trabajos');
    const rawProveedores = localStorage.getItem('proveedores');
    const rawOrdenes = localStorage.getItem('ordenes');
    const rawCompras = localStorage.getItem('compras');
    const rawFacturas = localStorage.getItem('facturas');

    type ClienteViejo = Cliente & { vehiculo?: string };
    let parsedClientes: ClienteViejo[] = rawClientes ? JSON.parse(rawClientes) : [];
    let parsedVehiculos: Vehiculo[] = rawVehiculos ? JSON.parse(rawVehiculos) : [];
    const parsedInventario: Refaccion[] = rawInventario ? JSON.parse(rawInventario) : [];

    if (parsedClientes.some(c => 'vehiculo' in c && c.vehiculo)) {
      const migrados: Vehiculo[] = [];
      parsedClientes = parsedClientes.map(({ vehiculo, ...c }) => {
        if (vehiculo) {
          migrados.push({ id: `mig_${c.id}`, clienteId: c.id, marca: vehiculo, modelo: '', anio: '', placa: '' });
        }
        return c;
      });
      parsedVehiculos = [...parsedVehiculos, ...migrados];
      localStorage.setItem('clientes', JSON.stringify(parsedClientes));
      localStorage.setItem('vehiculos', JSON.stringify(parsedVehiculos));
    }

    const parsedTrabajos: Trabajo[] = (rawTrabajos ? JSON.parse(rawTrabajos) : []).map(
      (t: Trabajo & { manoDeObra: number }) => {
        const partes: TrabajoRefaccion[] = (t.partes ?? []).map(
          (p: TrabajoRefaccion & { precioUnitario?: number }) => ({
            ...p,
            precioCompra: p.precioCompra ?? p.precioUnitario ?? 0,
            precioVenta: p.precioVenta ?? p.precioUnitario ?? 0,
            costoTotal: p.costoTotal ?? p.subtotal ?? 0,
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
          costoRefacciones: t.costoRefacciones ?? partes.reduce((s, p) => s + p.costoTotal, 0) ?? t.refacciones,
          pagos: t.pagos ?? [],
          estadoFacturacion: t.estadoFacturacion ?? 'sin_facturar',
          requiereFactura: t.requiereFactura ?? false,
          iva: t.iva ?? 0,
        };
      }
    );

    let parsedOrdenes: OrdenCompra[] = rawOrdenes ? JSON.parse(rawOrdenes) : [];
    if (!rawOrdenes && rawCompras) {
      type CompraLegacy = Compra & { items: CompraItem[] };
      const legacyCompras: CompraLegacy[] = JSON.parse(rawCompras);
      parsedOrdenes = legacyCompras.map(c => ({
        id: c.id,
        proveedorId: c.proveedorId,
        fecha: c.fecha,
        numeroOrden: undefined,
        descripcion: c.descripcion,
        partes: c.items,
        total: c.total,
        estado: 'recibida',
        fechaRecibida: c.fecha,
        pagos: c.pagos ?? [],
      }));
      localStorage.setItem('ordenes', JSON.stringify(parsedOrdenes));
    }

    /* eslint-disable react-hooks/set-state-in-effect */
    setClientes(parsedClientes);
    setVehiculos(parsedVehiculos);
    setInventario(parsedInventario);
    setTrabajos(parsedTrabajos);
    setProveedores(rawProveedores ? JSON.parse(rawProveedores) : []);
    setOrdenes(parsedOrdenes);
    setFacturas(rawFacturas ? JSON.parse(rawFacturas) : []);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

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

  const guardarTrabajo = (data: Omit<Trabajo, 'id' | 'total' | 'iva'>) => {
    const subtotal = data.manoDeObra + data.refacciones;
    const iva = data.requiereFactura ? Math.round(subtotal * 0.16 * 100) / 100 : 0;
    const total = subtotal + iva;
    const nuevo: Trabajo = {
      ...data,
      id: Date.now().toString(),
      iva,
      total,
      estadoFacturacion: data.requiereFactura ? data.estadoFacturacion ?? 'sin_facturar' : data.estadoFacturacion,
    };

    if (data.partes.length > 0) {
      const nuevoInv = inventario.map(r => {
        const usada = data.partes.find(p => p.refaccionId === r.id);
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

  const guardarProveedor = (data: Omit<Proveedor, 'id'>) => {
    const nuevo: Proveedor = { ...data, id: Date.now().toString() };
    const nuevos = [...proveedores, nuevo];
    setProveedores(nuevos);
    localStorage.setItem('proveedores', JSON.stringify(nuevos));
  };

  const guardarOrden = (data: Omit<OrdenCompra, 'id'>) => {
    const nueva: OrdenCompra = {
      ...data,
      id: Date.now().toString(),
      numeroOrden: data.numeroOrden || generarNumeroOrden(ordenes),
      estado: data.estado ?? 'pendiente',
      pagos: data.pagos ?? [],
    };
    const nuevas = [...ordenes, nueva];
    setOrdenes(nuevas);
    localStorage.setItem('ordenes', JSON.stringify(nuevas));
  };

  const recibirOrden = (ordenId: string) => {
    const orden = ordenes.find(o => o.id === ordenId);
    if (!orden || orden.estado !== 'pendiente') return;

    const nuevasOrdenes = ordenes.map(o =>
      o.id === ordenId
        ? { ...o, estado: 'recibida' as const, fechaRecibida: new Date().toISOString().split('T')[0] }
        : o
    );
    setOrdenes(nuevasOrdenes);
    localStorage.setItem('ordenes', JSON.stringify(nuevasOrdenes));

    if (orden.partes.length > 0) {
      const nuevoInv = inventario.map(r => {
        const item = orden.partes.find(p => p.refaccionId === r.id);
        return item ? { ...r, stock: r.stock + item.cantidad } : r;
      });
      setInventario(nuevoInv);
      localStorage.setItem('inventario', JSON.stringify(nuevoInv));
    }
  };

  const registrarPagoOrden = (ordenId: string, pago: Omit<PagoCompra, 'id'>) => {
    const nuevoPago: PagoCompra = { ...pago, id: Date.now().toString() };
    const nuevas = ordenes.map(o =>
      o.id === ordenId ? { ...o, pagos: [...(o.pagos ?? []), nuevoPago] } : o
    );
    setOrdenes(nuevas);
    localStorage.setItem('ordenes', JSON.stringify(nuevas));
  };

  const guardarFactura = (data: Omit<Factura, 'id' | 'numeroFactura'>) => {
    if (facturas.some(f => f.trabajoId === data.trabajoId)) return;

    const nueva: Factura = {
      ...data,
      id: Date.now().toString(),
      numeroFactura: generarNumeroFactura(facturas),
    };
    const nuevasFacturas = [...facturas, nueva];
    setFacturas(nuevasFacturas);
    localStorage.setItem('facturas', JSON.stringify(nuevasFacturas));

    const nuevosTrabajos = trabajos.map(t =>
      t.id === data.trabajoId
        ? { ...t, facturaId: nueva.id, estadoFacturacion: 'facturado' as const }
        : t
    );
    setTrabajos(nuevosTrabajos);
    localStorage.setItem('trabajos', JSON.stringify(nuevosTrabajos));
  };

  const registrarPagoFactura = (facturaId: string, pago: Omit<PagoFactura, 'id'>) => {
    const nuevoPago: PagoFactura = { ...pago, id: Date.now().toString() };
    const nuevas = facturas.map(f =>
      f.id === facturaId ? { ...f, pagos: [...(f.pagos ?? []), nuevoPago] } : f
    );
    setFacturas(nuevas);
    localStorage.setItem('facturas', JSON.stringify(nuevas));
  };

  const stockBajo = inventario.filter(r => r.stock <= r.stockMinimo).length;
  const pendientesPorCobrar = trabajos.filter(t => getEstadoPago(t) !== 'pagado').length;
  const pendientesPorPagar = ordenes.filter(o => getEstadoPagoOrden(o) !== 'pagado').length;
  const resumen = calcularResumenMensual(trabajos, mesActual);

  return {
    clientes,
    vehiculos,
    inventario,
    trabajos,
    proveedores,
    ordenes,
    facturas,
    vista,
    mesActual,
    stockBajo,
    pendientesPorCobrar,
    pendientesPorPagar,
    setVista,
    setMesActual,
    guardarCliente,
    guardarVehiculo,
    guardarRefaccion,
    recibirStock,
    guardarTrabajo,
    registrarPago,
    guardarProveedor,
    guardarOrden,
    recibirOrden,
    registrarPagoOrden,
    guardarFactura,
    registrarPagoFactura,
    resumen,
  };
}
