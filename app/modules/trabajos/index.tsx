'use client';

import { useState } from 'react';
import type { Cliente, Vehiculo, Refaccion, Trabajo, Factura, ManoDeObraItem, TrabajoRefaccion } from '@/app/types';
import { Label, Input, Select, Btn, SectionTitle, EmptyRow } from '@/app/components/ui';
import { labelVehiculo, fmt } from '@/app/lib/utils';
import { BuscadorRefacciones } from './BuscadorRefacciones';

// ── Finalization Modal ──────────────────────────────────────────────────────
function ModalFinalizacion({
  trabajo,
  cliente,
  vehiculo,
  onConfirmar,
  onCancelar,
}: {
  trabajo: Trabajo;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
  onConfirmar: (tipo: 'factura' | 'nota') => void;
  onCancelar: () => void;
}) {
  const subtotal = trabajo.manoDeObra + trabajo.refacciones;
  const ivaFactura = Math.round(subtotal * 0.16 * 100) / 100;
  const totalFactura = subtotal + ivaFactura;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onCancelar}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all text-lg font-bold"
          aria-label="Cerrar"
        >&#x2715;</button>

        <div className="text-center space-y-1">
          <div className="text-4xl mb-2">&#127937;</div>
          <h2 className="text-xl font-bold text-slate-800">Finalizar Trabajo</h2>
          <p className="text-sm text-slate-500">El camión ya salió del taller.</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-1 text-sm">
          <div className="font-semibold text-slate-700 truncate">{trabajo.descripcion}</div>
          {cliente && <div className="text-slate-500">Cliente: {cliente.nombre}</div>}
          {vehiculo && (
            <div className="text-slate-500">
              Vehículo: {[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}
              {vehiculo.placa && <span className="ml-1.5 text-xs font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{vehiculo.placa}</span>}
            </div>
          )}
          <div className="border-t border-slate-200 mt-2 pt-2 text-slate-700 font-medium">
            Subtotal: <span className="font-bold text-slate-900">${fmt(subtotal)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">¿Cómo se va a cobrar?</p>
          <button
            onClick={() => onConfirmar('nota')}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
          >
            <span className="text-3xl">&#128196;</span>
            <div className="flex-1">
              <div className="font-bold text-slate-800 group-hover:text-indigo-700">Nota</div>
              <div className="text-xs text-slate-500">Sin IVA — pago en efectivo o informal</div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-slate-900 text-lg">${fmt(subtotal)}</div>
              <div className="text-xs text-slate-400">sin IVA</div>
            </div>
          </button>
          <button
            onClick={() => onConfirmar('factura')}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left group"
          >
            <span className="text-3xl">&#129534;</span>
            <div className="flex-1">
              <div className="font-bold text-slate-800 group-hover:text-amber-700">Factura Fiscal</div>
              <div className="text-xs text-slate-500">Con IVA 16% — factura oficial SAT</div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-amber-700 text-lg">${fmt(totalFactura)}</div>
              <div className="text-xs text-amber-600">+${fmt(ivaFactura)} IVA</div>
            </div>
          </button>
        </div>

        <button
          onClick={onCancelar}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all text-slate-700 font-semibold text-sm"
        >
          &#8592; Regresar — el trabajo sigue en progreso
        </button>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function VistaTrabajo({
  clientes,
  vehiculos,
  inventario,
  trabajos,
  facturas,
  onGuardar,
  onFinalizar,
  onIrAInventario,
  onGenerarFactura,
  onIrAFacturas,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  inventario: Refaccion[];
  trabajos: Trabajo[];
  facturas: Factura[];
  onGuardar: (t: Omit<Trabajo, 'id' | 'total' | 'iva'>) => void;
  onFinalizar: (trabajoId: string, tipo: 'factura' | 'nota') => void;
  onIrAInventario: () => void;
  onGenerarFactura: (trabajoId: string) => void;
  onIrAFacturas: () => void;
}) {
  const emptyForm = {
    clienteId: '', vehiculoId: '',
    fecha: new Date().toISOString().split('T')[0],
    numeroOrden: '',
    descripcion: '',
    requiereFactura: false,
    folioFiscal: '',
    estado: 'pendiente' as Trabajo['estado'],
  };
  const [form, setForm] = useState(emptyForm);
  const [laborItems, setLaborItems] = useState<ManoDeObraItem[]>([]);
  const [laborConcepto, setLaborConcepto] = useState('');
  const [laborPrecio, setLaborPrecio]     = useState(0);
  const [partesSeleccionadas, setPartesSeleccionadas] = useState<TrabajoRefaccion[]>([]);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'completado'>('todos');

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === form.clienteId);
  const totalManoDeObra       = laborItems.reduce((s, l) => s + l.precio, 0);
  const totalVentaRefacciones = partesSeleccionadas.reduce((s, p) => s + p.subtotal, 0);
  const totalCostoRefacciones = partesSeleccionadas.reduce((s, p) => s + p.costoTotal, 0);
  const utilidadRefacciones   = totalVentaRefacciones - totalCostoRefacciones;
  const subtotalSinIVA        = totalManoDeObra + totalVentaRefacciones;
  const ivaCalculado          = form.requiereFactura ? Math.round(subtotalSinIVA * 0.16 * 100) / 100 : 0;
  const totalConIVA           = subtotalSinIVA + ivaCalculado;

  const handleClienteChange = (clienteId: string) =>
    setForm(f => ({ ...f, clienteId, vehiculoId: '' }));

  const agregarLabor = () => {
    if (!laborConcepto.trim() || laborPrecio <= 0) return;
    setLaborItems(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      concepto: laborConcepto.trim(),
      precio: laborPrecio,
    }]);
    setLaborConcepto('');
    setLaborPrecio(0);
  };

  const removerLabor = (id: string) =>
    setLaborItems(prev => prev.filter(l => l.id !== id));

  const agregarParteDesde = (refId: string, cant: number, pVenta: number) => {
    const ref = inventario.find(r => r.id === refId);
    if (!ref || cant <= 0) return;
    const pv = pVenta > 0 ? pVenta : ref.precioCompra;
    setPartesSeleccionadas(prev => {
      const existente = prev.find(p => p.refaccionId === ref.id);
      if (existente) {
        const nuevaCantidad = existente.cantidad + cant;
        return prev.map(p => p.refaccionId === ref.id ? {
          ...p,
          cantidad: nuevaCantidad,
          subtotal:   nuevaCantidad * p.precioVenta,
          costoTotal: nuevaCantidad * p.precioCompra,
        } : p);
      }
      return [...prev, {
        refaccionId: ref.id, nombre: ref.nombre, codigo: ref.codigo,
        cantidad: cant,
        precioCompra: ref.precioCompra,
        precioVenta: pv,
        subtotal:   cant * pv,
        costoTotal: cant * ref.precioCompra,
      }];
    });
  };

  const removerParte = (refaccionId: string) =>
    setPartesSeleccionadas(prev => prev.filter(p => p.refaccionId !== refaccionId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteId || !form.vehiculoId || !form.descripcion) return;
    onGuardar({
      ...form,
      numeroOrden: form.numeroOrden?.trim() || undefined,
      manoDeObra: totalManoDeObra,
      manoDeObraItems: laborItems,
      refacciones: totalVentaRefacciones,
      costoRefacciones: totalCostoRefacciones,
      requiereFactura: false,
      folioFiscal: undefined,
      partes: partesSeleccionadas,
      pagos: [],
    });
    setForm(emptyForm);
    setLaborItems([]);
    setLaborConcepto('');
    setLaborPrecio(0);
    setPartesSeleccionadas([]);
  };

  const getCliente  = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);

  // ── Compatibility filtering ──
  const vehiculoDelTrabajo = vehiculos.find(v => v.id === form.vehiculoId);

  const isCompatible = (r: Refaccion): boolean => {
    if (!vehiculoDelTrabajo) return true;
    if (!r.compatibilidad || r.compatibilidad.length === 0) return true; // universal
    const marca  = vehiculoDelTrabajo.marca.toLowerCase().trim();
    const modelo = vehiculoDelTrabajo.modelo.toLowerCase().trim();
    return r.compatibilidad.some(c =>
      c.marca.toLowerCase().trim() === marca &&
      c.modelos.some(m => m.toLowerCase().trim() === modelo)
    );
  };

  // Parts grouped for the picker optgroups
  const partesParaEstaUnidad  = inventario.filter(r => r.vehiculoId === form.vehiculoId && isCompatible(r));
  const partesCompatibles      = inventario.filter(r => r.vehiculoId !== form.vehiculoId && r.compatibilidad?.length && isCompatible(r));
  const partesUniversales      = inventario.filter(r => r.vehiculoId !== form.vehiculoId && (!r.compatibilidad || r.compatibilidad.length === 0));
  // When vehicle is selected: only compatible+universal+linked-to-this-unit; otherwise all
  const totalCompatibles = form.vehiculoId
    ? partesParaEstaUnidad.length + partesCompatibles.length + partesUniversales.length
    : inventario.length;

  const trabajosPendientes = trabajos.filter(t => t.estado === 'pendiente');
  const trabajosFiltrados = filtroEstado === 'todos'
    ? trabajos
    : trabajos.filter(t => t.estado === filtroEstado);
  const trabajoFinalizando = finalizandoId ? trabajos.find(t => t.id === finalizandoId) : null;

  return (
    <div>
      {trabajoFinalizando && (
        <ModalFinalizacion
          trabajo={trabajoFinalizando}
          cliente={getCliente(trabajoFinalizando.clienteId)}
          vehiculo={getVehiculo(trabajoFinalizando.vehiculoId)}
          onConfirmar={(tipo) => {
            onFinalizar(finalizandoId!, tipo);
            setFinalizandoId(null);
          }}
          onCancelar={() => setFinalizandoId(null)}
        />
      )}
      <SectionTitle title="Registro de Trabajos" subtitle="Selecciona cliente, unidad y las refacciones usadas del inventario." />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Nuevo Trabajo</h3>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ① Cliente + ② Unidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>① Cliente</Label>
              <Select value={form.clienteId} onChange={e => handleClienteChange(e.target.value)} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </div>
            <div>
              <Label>② Unidad / Vehículo</Label>
              <Select value={form.vehiculoId} onChange={e => setForm(f => ({ ...f, vehiculoId: e.target.value }))}
                required disabled={!form.clienteId || vehiculosDelCliente.length === 0}>
                <option value="">Seleccionar unidad...</option>
                {vehiculosDelCliente.map(v => <option key={v.id} value={v.id}>{labelVehiculo(v)}</option>)}
              </Select>
            </div>
          </div>

          {form.clienteId && vehiculosDelCliente.length === 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <span>⚠️</span>
              <span>Este cliente no tiene unidades. Ve a <span className="font-bold">👥 Clientes</span> para registrar una primero.</span>
            </div>
          )}

          {/* Fecha + Número de orden + Descripción */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <Label>Número de Orden</Label>
              <Input type="text" placeholder="Ej. 001, OT-2026-45..." value={form.numeroOrden}
                onChange={e => setForm(f => ({ ...f, numeroOrden: e.target.value }))} />
            </div>
            <div>
              <Label>Descripción general del trabajo</Label>
              <Input type="text" placeholder="Ej. Servicio completo frenos y aceite..." value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required />
            </div>
          </div>

          {/* ② Mano de Obra — multi-item */}
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-700">
              <span className="text-xs font-bold text-white uppercase tracking-widest">② Mano de Obra</span>
              <span className="ml-3 text-slate-400 text-xs">Agrega cada tarea con su precio</span>
            </div>
            <div className="p-4 space-y-4">
              {/* Labor picker */}
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-48">
                  <Label>Concepto</Label>
                  <Input type="text" placeholder="Ej. Arreglo de frenos, engrase de pernos..."
                    value={laborConcepto}
                    onChange={e => setLaborConcepto(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarLabor(); } }}
                  />
                </div>
                <div className="w-36">
                  <Label>Precio ($)</Label>
                  <Input type="number" placeholder="0.00" min="0.01" step="0.01"
                    value={laborPrecio || ''}
                    onChange={e => setLaborPrecio(Number(e.target.value))} />
                </div>
                <div className="flex items-end">
                  <Btn variant="primary"
                    disabled={!laborConcepto.trim() || laborPrecio <= 0}
                    onClick={agregarLabor}>
                    + Agregar
                  </Btn>
                </div>
              </div>

              {/* Labor items table */}
              {laborItems.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Concepto</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Precio</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {laborItems.map(l => (
                        <tr key={l.id} className="bg-white">
                          <td className="px-3 py-2 text-slate-800 font-medium">{l.concepto}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(l.precio)}</td>
                          <td className="px-3 py-2 text-center">
                            <Btn size="sm" variant="danger" onClick={() => removerLabor(l.id)}>✕</Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-3 py-2 text-sm font-bold text-slate-700 text-right">Total Mano de Obra:</td>
                        <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalManoDeObra)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {laborItems.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">
                  Sin conceptos de mano de obra. El trabajo se registra con mano de obra = $0.00
                </p>
              )}
            </div>
          </div>

          {/* ③ Refacciones del inventario */}
          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-widest">③ Refacciones del Inventario</span>
              {inventario.length === 0 && (
                <button type="button" onClick={onIrAInventario}
                  className="text-xs text-indigo-300 hover:text-white underline font-medium">
                  Ir a Inventario →
                </button>
              )}
            </div>

            {inventario.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                <p>El inventario está vacío.</p>
                <button type="button" onClick={onIrAInventario}
                  className="mt-2 text-indigo-600 font-semibold hover:underline">
                  Agregar refacciones al inventario →
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Buscar refacción — abre el buscador modal */}
                <button
                  type="button"
                  onClick={() => setMostrarBuscador(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔍</span>
                    <div>
                      <span className="font-semibold text-slate-700 group-hover:text-indigo-700">Buscar refacción...</span>
                      {form.vehiculoId && vehiculoDelTrabajo && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {totalCompatibles} pieza{totalCompatibles !== 1 ? 's' : ''} compatible{totalCompatibles !== 1 ? 's' : ''} con {vehiculoDelTrabajo.marca} {vehiculoDelTrabajo.modelo}
                        </p>
                      )}
                      {!form.vehiculoId && (
                        <p className="text-xs text-slate-400 mt-0.5">{inventario.length} piezas disponibles</p>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-400 text-xl">›</span>
                </button>

                {/* Lista de partes seleccionadas */}
                {partesSeleccionadas.length > 0 && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Refacción</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Cant.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Venta</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wide">Margen</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {partesSeleccionadas.map(p => {
                          const margen = p.subtotal - p.costoTotal;
                          return (
                            <tr key={p.refaccionId} className="bg-white">
                              <td className="px-3 py-2 text-slate-800 font-medium">
                                {p.nombre}
                                {p.codigo && <span className="ml-1.5 text-xs font-mono text-slate-400">{p.codigo}</span>}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700">{p.cantidad}</td>
                              <td className="px-3 py-2 text-right text-slate-400 text-xs">${fmt(p.costoTotal)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-900">${fmt(p.subtotal)}</td>
                              <td className="px-3 py-2 text-right font-medium text-emerald-600">${fmt(margen)}</td>
                              <td className="px-3 py-2 text-center">
                                <Btn size="sm" variant="danger" onClick={() => removerParte(p.refaccionId)}>✕</Btn>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                        <tr>
                          <td colSpan={2} className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Totales:</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-400 font-semibold">${fmt(totalCostoRefacciones)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900">${fmt(totalVentaRefacciones)}</td>
                          <td className="px-3 py-2 text-right font-extrabold text-emerald-600">${fmt(utilidadRefacciones)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {partesSeleccionadas.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">
                    Sin refacciones agregadas. El trabajo se registra con refacciones = $0.00
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Nota: IVA se elige al finalizar ── */}
          <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700 flex items-start gap-2">
            <span className="text-lg mt-0.5">ℹ️</span>
            <span>El IVA se elige cuando el trabajo se <strong>finaliza</strong> — al presionar el botón 🏁 Finalizar elegirás entre <strong>Nota</strong> (sin IVA) o <strong>Factura Fiscal</strong> (IVA 16%).</span>
          </div>

          {(totalManoDeObra > 0 || totalVentaRefacciones > 0) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-6">
                <div>
                  <span className="text-indigo-500 font-semibold">Mano de obra</span>
                  {laborItems.length > 0 && <span className="text-indigo-400 ml-1">({laborItems.length} concepto{laborItems.length !== 1 ? 's' : ''})</span>}
                  {': '}<span className="font-bold text-slate-800">${fmt(totalManoDeObra)}</span>
                </div>
                <div><span className="text-indigo-500 font-semibold">Venta refacciones:</span> <span className="font-bold text-slate-800">${fmt(totalVentaRefacciones)}</span></div>
                <div><span className="text-indigo-700 font-bold">Subtotal: </span><span className="font-extrabold text-indigo-800 text-base">${fmt(subtotalSinIVA)}</span></div>
              </div>
              {utilidadRefacciones !== 0 && (
                <div className="text-xs text-slate-500 border-t border-indigo-100 pt-2 flex flex-wrap gap-4">
                  <span>Costo refacciones: <strong className="text-slate-700">${fmt(totalCostoRefacciones)}</strong></span>
                  <span>Margen en partes: <strong className={utilidadRefacciones >= 0 ? 'text-emerald-600' : 'text-rose-600'}>${fmt(utilidadRefacciones)}</strong></span>
                  <span>Utilidad total: <strong className="text-emerald-700">${fmt(totalManoDeObra + utilidadRefacciones)}</strong></span>
                </div>
              )}
            </div>
          )}

          <Btn type="submit" variant="primary" fullWidth
            disabled={!form.clienteId || !form.vehiculoId || !form.descripcion}>
            ✓ Registrar Trabajo
          </Btn>
        </form>
      </div>

      {/* ── Historial ── */}
      <div>
        {/* Banner: trabajos pendientes */}
        {trabajosPendientes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-4 flex items-center gap-3 text-sm">
            <span className="text-2xl">🚛</span>
            <span className="text-amber-800 font-semibold">
              {trabajosPendientes.length} trabajo{trabajosPendientes.length !== 1 ? 's' : ''} en el taller — pendiente{trabajosPendientes.length !== 1 ? 's' : ''} de finalizar
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-base font-bold text-slate-700">
            Historial de Trabajos
            {trabajos.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajos.length}</span>}
          </h3>
          {/* Filtro estado */}
          {trabajos.length > 0 && (
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {([['todos', 'Todos'], ['pendiente', '🕐 En progreso'], ['completado', '✓ Terminados']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFiltroEstado(val)}
                  className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${filtroEstado === val ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Fecha','Estado','Cliente','Unidad','Descripción','Refacciones','Mano de Obra','Total',''].map((h, i) => (
                  <th key={i} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 5 && i <= 7 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajosFiltrados.map((trabajo, i) => {
                const cliente  = getCliente(trabajo.clienteId);
                const vehiculo = getVehiculo(trabajo.vehiculoId);
                const isPendiente = trabajo.estado === 'pendiente';
                const badgeEstado = trabajo.tipoDocumento === 'factura'
                  ? <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">🧾 Factura</span>
                  : trabajo.tipoDocumento === 'nota'
                    ? <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">📄 Nota</span>
                    : isPendiente
                      ? <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-2 py-0.5 rounded-full border border-amber-200">🕐 En progreso</span>
                      : <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">✓ Terminado</span>;
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                      {new Date(trabajo.fecha).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{badgeEstado}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      {vehiculo ? (
                        <span>
                          <span className="text-slate-700 font-medium">{[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>
                          {vehiculo.placa && <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 font-mono font-semibold px-1.5 py-0.5 rounded">{vehiculo.placa}</span>}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {trabajo.descripcion}
                      {trabajo.partes?.length > 0 && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-full">
                          {trabajo.partes.length} pieza{trabajo.partes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {trabajo.estadoFacturacion === 'facturado' ? (
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full">✓ Facturado</span>
                      ) : (
                        <button type="button"
                          onClick={() => { onGenerarFactura(trabajo.id); onIrAFacturas(); }}
                          className="ml-2 text-xs bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded-full hover:bg-amber-100 hover:text-amber-700 transition-colors">
                          + Factura
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      <div>${fmt(trabajo.refacciones)}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      <div>${fmt(trabajo.manoDeObra)}</div>
                      {trabajo.manoDeObraItems?.length > 1 && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {trabajo.manoDeObraItems.length} conceptos
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">${fmt(trabajo.total)}</td>
                    <td className="px-4 py-3 text-center">
                      {isPendiente && (
                        <button
                          type="button"
                          onClick={() => setFinalizandoId(trabajo.id)}
                          className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                        >
                          🏁 Finalizar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {trabajosFiltrados.length === 0 && <EmptyRow cols={9} message={filtroEstado === 'todos' ? 'Sin trabajos registrados. Agrega el primero arriba.' : `Sin trabajos con estado "${filtroEstado}".`} />}
            </tbody>
          </table>
        </div>
      </div>
      {mostrarBuscador && (
        <BuscadorRefacciones
          inventario={inventario}
          vehiculo={vehiculoDelTrabajo}
          clienteId={form.clienteId}
          trabajos={trabajos}
          onAgregar={agregarParteDesde}
          onCerrar={() => setMostrarBuscador(false)}
        />
      )}
    </div>
  );
}
