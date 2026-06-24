'use client';

import { useState, useRef } from 'react';
import type { Factura, Trabajo, Cliente, Vehiculo, OrdenCompra, Proveedor, PagoFactura, Pago, PagoCompra } from '@/app/types';
import { Label, Input, Select, Btn, SectionTitle } from '@/app/components/ui';
import {
  fmt,
  getEstadoPagoFactura, getMontoPagadoFactura, getSaldoFactura,
  getEstadoPago, getMontoPagado, getSaldo,
  getEstadoPagoOrden, getMontoPagadoOrden, getSaldoOrden,
  BADGE_ESTADO,
  type FiltroCuenta,
} from '@/app/lib/utils';

// ─── ReporteCliente — imprimible / compartible ────────────────────────────────

function ReporteCliente({
  cliente,
  facturas,
  trabajos,
  vehiculos,
  onCerrar,
}: {
  cliente: Cliente;
  facturas: Factura[];
  trabajos: Trabajo[];
  vehiculos: Vehiculo[];
  onCerrar: () => void;
}) {
  const reporteRef = useRef<HTMLDivElement>(null);

  const facsPend = facturas.filter(f => getEstadoPagoFactura(f) !== 'pagado');
  // Notas no son facturables — excluir del resumen de cuentas por cobrar
  const trabsPend = trabajos.filter(t => t.tipoDocumento !== 'nota' && getEstadoPago(t) !== 'pagado');
  const totalPendiente = facsPend.reduce((s, f) => s + getSaldoFactura(f), 0)
    + trabsPend.reduce((s, t) => s + getSaldo(t), 0);

  const handleImprimir = () => {
    const win = window.open('', '_blank');
    if (!win || !reporteRef.current) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8"/>
        <title>Reporte — ${cliente.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 13px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .sub { color: #64748b; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 10px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; }
          td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
          .total-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 14px 18px; display: inline-block; }
          .total-label { font-size: 11px; font-weight: bold; color: #e11d48; text-transform: uppercase; letter-spacing: 0.08em; }
          .total-val { font-size: 26px; font-weight: 900; color: #be123c; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
          .badge-pend { background: #fff7ed; color: #c2410c; }
          .badge-parc { background: #eff6ff; color: #1d4ed8; }
          .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${reporteRef.current.innerHTML}
        <div class="footer">Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        <script>window.onload = () => { window.print(); }<\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">📄 Reporte de Saldo</h2>
            <p className="text-sm text-slate-500">{cliente.nombre}</p>
          </div>
          <div className="flex gap-2">
            <Btn variant="primary" size="sm" onClick={handleImprimir}>🖨️ Imprimir / Guardar PDF</Btn>
            <Btn variant="ghost" size="sm" onClick={onCerrar}>✕</Btn>
          </div>
        </div>

        {/* Printable content */}
        <div ref={reporteRef} className="px-6 py-5">
          <h1 className="text-xl font-black text-slate-800 mb-1">Estado de Cuenta</h1>
          <p className="text-sm text-slate-500 mb-6">
            Cliente: <strong>{cliente.nombre}</strong>
            {cliente.telefono && <> · Tel: {cliente.telefono}</>}
            <br />Fecha: {fechaHoy}
          </p>

          {/* Facturas pendientes */}
          {facsPend.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">🧾 Facturas con saldo pendiente</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Folio</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Fecha</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Total</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Pagado</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Saldo</th>
                    <th className="text-center py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {facsPend.map(f => {
                    const estado = getEstadoPagoFactura(f);
                    const badge = BADGE_ESTADO[estado];
                    return (
                      <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-xs text-slate-600">{f.numeroFactura}</td>
                        <td className="py-2 px-3 text-slate-600">{new Date(f.fecha).toLocaleDateString('es-MX')}</td>
                        <td className="py-2 px-3 text-right text-slate-800 font-medium">${fmt(f.total)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-medium">${fmt(getMontoPagadoFactura(f))}</td>
                        <td className="py-2 px-3 text-right text-rose-600 font-bold">${fmt(getSaldoFactura(f))}</td>
                        <td className="py-2 px-3 text-center"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Trabajos sin factura pendientes */}
          {trabsPend.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">🔧 Trabajos con saldo pendiente</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Descripción</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Fecha</th>
                    <th className="text-left py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Unidad</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Total</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Pagado</th>
                    <th className="text-right py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Saldo</th>
                    <th className="text-center py-2 px-3 text-xs text-slate-500 font-semibold border-b border-slate-200">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {trabsPend.map(t => {
                    const veh = vehiculos.find(v => v.id === t.vehiculoId);
                    const estado = getEstadoPago(t);
                    const badge = BADGE_ESTADO[estado];
                    return (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-700 max-w-[180px] truncate">{t.descripcion}</td>
                        <td className="py-2 px-3 text-slate-600">{new Date(t.fecha).toLocaleDateString('es-MX')}</td>
                        <td className="py-2 px-3 text-slate-500 text-xs">{veh ? `${veh.anio} ${veh.marca} ${veh.modelo}`.trim() : '—'}</td>
                        <td className="py-2 px-3 text-right text-slate-800 font-medium">${fmt(t.total)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-medium">${fmt(getMontoPagado(t))}</td>
                        <td className="py-2 px-3 text-right text-rose-600 font-bold">${fmt(getSaldo(t))}</td>
                        <td className="py-2 px-3 text-center"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {facsPend.length === 0 && trabsPend.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-medium text-slate-500">Este cliente no tiene saldos pendientes</p>
            </div>
          )}

          {/* Total box */}
          {totalPendiente > 0 && (
            <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total por Cobrar a {cliente.nombre}</div>
                <div className="text-3xl font-black text-rose-700">${fmt(totalPendiente)}</div>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VistaCuentas (Por Cobrar) ────────────────────────────────────────────────

export function VistaCuentas({
  facturas,
  trabajos,
  clientes,
  vehiculos,
  onRegistrarPagoFactura,
  onRegistrarPagoTrabajo,
}: {
  facturas: Factura[];
  trabajos: Trabajo[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onRegistrarPagoFactura: (facturaId: string, pago: Omit<PagoFactura, 'id'>) => void;
  onRegistrarPagoTrabajo: (trabajoId: string, pago: Omit<Pago, 'id'>) => void;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [filtro, setFiltro] = useState<FiltroCuenta>('todos');
  const [clienteFiltroId, setClienteFiltroId] = useState<string>('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [expandidoF, setExpandidoF] = useState<string | null>(null);
  const [expandidoT, setExpandidoT] = useState<string | null>(null);
  const [pagoFormF, setPagoFormF] = useState({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' });
  const [pagoFormT, setPagoFormT] = useState({ monto: 0, fecha: hoy, nota: '' });

  // Legacy: trabajos without a facturaId — notas never get invoiced
  const legacyTrabajos = trabajos.filter(t => !t.facturaId && t.tipoDocumento !== 'nota');

  // Clients that actually have records in AR
  const clientesConRegistros = clientes.filter(c =>
    facturas.some(f => f.clienteId === c.id) || legacyTrabajos.some(t => t.clienteId === c.id)
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Filtered by text search (for dropdown suggestions)
  const clientesFiltrados = busquedaCliente.trim()
    ? clientesConRegistros.filter(c => c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()))
    : clientesConRegistros;

  const clienteSeleccionado = clienteFiltroId ? clientes.find(c => c.id === clienteFiltroId) ?? null : null;

  // Apply client filter first, then status filter
  const facturasPorCliente = clienteFiltroId ? facturas.filter(f => f.clienteId === clienteFiltroId) : facturas;
  const legacyPorCliente   = clienteFiltroId ? legacyTrabajos.filter(t => t.clienteId === clienteFiltroId) : legacyTrabajos;

  const facturasFiltradas = [...facturasPorCliente]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(f => filtro === 'todos' || getEstadoPagoFactura(f) === filtro);

  const legacyFiltrados = legacyPorCliente.filter(t => filtro === 'todos' || getEstadoPago(t) === filtro);

  // Global total pending (all clients)
  const totalPendienteGlobal = facturas.filter(f => getEstadoPagoFactura(f) !== 'pagado').reduce((s, f) => s + getSaldoFactura(f), 0)
    + legacyTrabajos.filter(t => getEstadoPago(t) !== 'pagado').reduce((s, t) => s + getSaldo(t), 0);

  // Client-specific pending total
  const totalPendienteCliente = clienteFiltroId
    ? facturasPorCliente.filter(f => getEstadoPagoFactura(f) !== 'pagado').reduce((s, f) => s + getSaldoFactura(f), 0)
      + legacyPorCliente.filter(t => getEstadoPago(t) !== 'pagado').reduce((s, t) => s + getSaldo(t), 0)
    : 0;

  const totalPendiente = clienteFiltroId ? totalPendienteCliente : totalPendienteGlobal;

  const counts = {
    todos: facturasPorCliente.length + legacyPorCliente.length,
    pendiente: facturasPorCliente.filter(f => getEstadoPagoFactura(f) === 'pendiente').length + legacyPorCliente.filter(t => getEstadoPago(t) === 'pendiente').length,
    parcial: facturasPorCliente.filter(f => getEstadoPagoFactura(f) === 'parcial').length + legacyPorCliente.filter(t => getEstadoPago(t) === 'parcial').length,
    pagado: facturasPorCliente.filter(f => getEstadoPagoFactura(f) === 'pagado').length + legacyPorCliente.filter(t => getEstadoPago(t) === 'pagado').length,
  };

  const limpiarFiltroCliente = () => {
    setClienteFiltroId('');
    setBusquedaCliente('');
    setFiltro('todos');
  };

  return (
    <div>
      {mostrarReporte && clienteSeleccionado && (
        <ReporteCliente
          cliente={clienteSeleccionado}
          facturas={facturasPorCliente}
          trabajos={legacyPorCliente}
          vehiculos={vehiculos}
          onCerrar={() => setMostrarReporte(false)}
        />
      )}

      <SectionTitle title="Cuentas por Cobrar" subtitle="Pagos de clientes: facturas emitidas y trabajos pendientes de cobro." />

      {/* ── Búsqueda / filtro por cliente ── */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 w-full">
            <Label>🔍 Buscar cliente</Label>
            {clienteSeleccionado ? (
              <div className="flex items-center gap-2 mt-1 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                <span className="font-semibold text-indigo-800 flex-1">{clienteSeleccionado.nombre}</span>
                {clienteSeleccionado.telefono && <span className="text-xs text-indigo-500">{clienteSeleccionado.telefono}</span>}
                <button type="button" onClick={limpiarFiltroCliente} className="text-indigo-400 hover:text-indigo-700 text-lg font-bold leading-none ml-1">×</button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Nombre del cliente..."
                  value={busquedaCliente}
                  onChange={e => setBusquedaCliente(e.target.value)}
                />
                {busquedaCliente && clientesFiltrados.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {clientesFiltrados.map(c => {
                      const saldo = facturas.filter(f => f.clienteId === c.id && getEstadoPagoFactura(f) !== 'pagado').reduce((s, f) => s + getSaldoFactura(f), 0)
                        + legacyTrabajos.filter(t => t.clienteId === c.id && getEstadoPago(t) !== 'pagado').reduce((s, t) => s + getSaldo(t), 0);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between gap-3"
                          onClick={() => { setClienteFiltroId(c.id); setBusquedaCliente(''); }}
                        >
                          <div>
                            <span className="font-semibold text-slate-800 text-sm">{c.nombre}</span>
                            {c.telefono && <span className="text-xs text-slate-400 ml-2">{c.telefono}</span>}
                          </div>
                          {saldo > 0 && <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full shrink-0">Debe ${fmt(saldo)}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {busquedaCliente && clientesFiltrados.length === 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm text-slate-400">
                    No se encontró ningún cliente con ese nombre
                  </div>
                )}
              </div>
            )}
          </div>

          {clienteSeleccionado && (
            <Btn
              variant="primary"
              size="sm"
              onClick={() => setMostrarReporte(true)}
              disabled={totalPendienteCliente === 0}
            >
              📄 Ver Reporte
            </Btn>
          )}
        </div>

        {!clienteSeleccionado && clientesConRegistros.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-slate-400 self-center">Pendientes:</span>
            {clientesConRegistros
              .filter(c => {
                const s = facturas.filter(f => f.clienteId === c.id && getEstadoPagoFactura(f) !== 'pagado').reduce((a, f) => a + getSaldoFactura(f), 0)
                  + legacyTrabajos.filter(t => t.clienteId === c.id && getEstadoPago(t) !== 'pagado').reduce((a, t) => a + getSaldo(t), 0);
                return s > 0;
              })
              .slice(0, 6)
              .map(c => {
                const saldo = facturas.filter(f => f.clienteId === c.id && getEstadoPagoFactura(f) !== 'pagado').reduce((s, f) => s + getSaldoFactura(f), 0)
                  + legacyTrabajos.filter(t => t.clienteId === c.id && getEstadoPago(t) !== 'pagado').reduce((s, t) => s + getSaldo(t), 0);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setClienteFiltroId(c.id)}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    {c.nombre} · ${fmt(saldo)}
                  </button>
                );
              })
            }
          </div>
        )}
      </div>

      {/* ── Total por cobrar ── */}
      {totalPendiente > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-5 flex flex-wrap gap-6 items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">
              {clienteSeleccionado ? `Saldo pendiente — ${clienteSeleccionado.nombre}` : 'Total por Cobrar'}
            </div>
            <div className="text-2xl font-extrabold text-rose-700">${fmt(totalPendiente)}</div>
          </div>
          {clienteSeleccionado && (
            <Btn variant="primary" size="sm" onClick={() => setMostrarReporte(true)}>
              📄 Generar Reporte
            </Btn>
          )}
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {(['todos','pendiente','parcial','pagado'] as FiltroCuenta[]).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
            {f === 'todos' ? 'Todos' : BADGE_ESTADO[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {/* ── Facturas section ── */}
      {facturasFiltradas.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">🧾 Facturas emitidas</h3>
          <div className="space-y-2">
            {facturasFiltradas.map(factura => {
              const cliente  = clientes.find(c => c.id === factura.clienteId);
              const estado   = getEstadoPagoFactura(factura);
              const montoPag = getMontoPagadoFactura(factura);
              const saldo    = getSaldoFactura(factura);
              const badge    = BADGE_ESTADO[estado];
              const isExp    = expandidoF === factura.id;
              return (
                <div key={factura.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`grid grid-cols-1 sm:grid-cols-6 gap-2 items-center px-4 py-3 ${isExp ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                    <div className="sm:col-span-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{factura.numeroFactura}</span>
                        <span className="font-semibold text-slate-800 text-sm">{cliente?.nombre ?? '—'}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{new Date(factura.fecha).toLocaleDateString('es-MX')}</div>
                    </div>
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Total</div><div className="font-semibold text-slate-800">${fmt(factura.total)}</div></div>
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div><div className="font-semibold text-emerald-600">${fmt(montoPag)}</div></div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div><div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div></div>
                      <Btn size="sm" variant={isExp ? 'ghost' : estado !== 'pagado' ? 'success' : 'ghost'}
                        onClick={() => { setExpandidoF(isExp ? null : factura.id); setPagoFormF({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' }); }}>
                        {isExp ? '✕' : estado !== 'pagado' ? '+ Pago' : 'Ver'}
                      </Btn>
                    </div>
                  </div>
                  {isExp && (
                    <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-3">
                      {(factura.pagos ?? []).length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                          <div className="space-y-1">
                            {(factura.pagos ?? []).map(p => (
                              <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                <div className="flex gap-3">
                                  <span className="text-slate-500">{new Date(p.fecha).toLocaleDateString('es-MX')}</span>
                                  <span className="text-slate-500">{p.metodoPago}</span>
                                </div>
                                <span className="font-semibold text-emerald-600">+ ${fmt(p.monto)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {estado !== 'pagado' && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar Pago</p>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div><Label>Fecha</Label><Input type="date" value={pagoFormF.fecha} onChange={e => setPagoFormF(f => ({ ...f, fecha: e.target.value }))} /></div>
                            <div><Label>Monto ($)</Label><Input type="number" placeholder="0.00" min="0.01" step="0.01" value={pagoFormF.monto || ''} onChange={e => setPagoFormF(f => ({ ...f, monto: Number(e.target.value) }))} /></div>
                            <div><Label>Método</Label>
                              <Select value={pagoFormF.metodoPago} onChange={e => setPagoFormF(f => ({ ...f, metodoPago: e.target.value }))}>
                                {['Efectivo','Transferencia','Tarjeta','Cheque','Otro'].map(m => <option key={m}>{m}</option>)}
                              </Select></div>
                            <div className="flex items-end"><Btn variant="success" fullWidth disabled={pagoFormF.monto <= 0} onClick={() => { onRegistrarPagoFactura(factura.id, { monto: Math.min(pagoFormF.monto, saldo), fecha: pagoFormF.fecha, metodoPago: pagoFormF.metodoPago }); setPagoFormF({ monto: 0, fecha: hoy, metodoPago: 'Efectivo' }); setExpandidoF(null); }}>✓ Registrar</Btn></div>
                          </div>
                        </div>
                      )}
                      {estado === 'pagado' && <p className="text-xs text-emerald-600 font-semibold text-center">✅ Esta factura está completamente pagada.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legacy trabajos (without factura) ── */}
      {legacyFiltrados.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">🔧 Trabajos sin factura (legado)</h3>
          <div className="space-y-2">
            {legacyFiltrados.map(trabajo => {
              const cliente  = clientes.find(c => c.id === trabajo.clienteId);
              const vehiculo = vehiculos.find(v => v.id === trabajo.vehiculoId);
              const estado   = getEstadoPago(trabajo);
              const montoPag = getMontoPagado(trabajo);
              const saldo    = getSaldo(trabajo);
              const badge    = BADGE_ESTADO[estado];
              const isExp    = expandidoT === trabajo.id;
              return (
                <div key={trabajo.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`grid grid-cols-1 sm:grid-cols-6 gap-2 items-center px-4 py-3 ${isExp ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                    <div className="sm:col-span-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{cliente?.nombre ?? '—'}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                        <span>{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</span>
                        {vehiculo && <span>· {[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>}
                        <span>· {trabajo.descripcion}</span>
                      </div>
                    </div>
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Total</div><div className="font-semibold text-slate-800">${fmt(trabajo.total)}</div></div>
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div><div className="font-semibold text-emerald-600">${fmt(montoPag)}</div></div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div><div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div></div>
                      <Btn size="sm" variant={isExp ? 'ghost' : estado !== 'pagado' ? 'success' : 'ghost'} onClick={() => { setExpandidoT(isExp ? null : trabajo.id); setPagoFormT({ monto: 0, fecha: hoy, nota: '' }); }}>
                        {isExp ? '✕' : estado !== 'pagado' ? '+ Pago' : 'Ver'}
                      </Btn>
                    </div>
                  </div>
                  {isExp && (
                    <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-3">
                      {(trabajo.pagos ?? []).length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                          <div className="space-y-1">
                            {(trabajo.pagos ?? []).map(p => (
                              <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                                <div className="flex gap-3">
                                  <span className="text-slate-500">{new Date(p.fecha).toLocaleDateString('es-MX')}</span>
                                  {p.nota && <span className="text-slate-500 italic">{p.nota}</span>}
                                </div>
                                <span className="font-semibold text-emerald-600">+ ${fmt(p.monto)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {estado !== 'pagado' && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div><Label>Fecha</Label><Input type="date" value={pagoFormT.fecha} onChange={e => setPagoFormT(f => ({ ...f, fecha: e.target.value }))} /></div>
                          <div><Label>Monto ($)</Label><Input type="number" placeholder="0.00" min="0.01" step="0.01" value={pagoFormT.monto || ''} onChange={e => setPagoFormT(f => ({ ...f, monto: Number(e.target.value) }))} /></div>
                          <div><Label>Nota</Label><Input type="text" placeholder="Efectivo, transferencia..." value={pagoFormT.nota} onChange={e => setPagoFormT(f => ({ ...f, nota: e.target.value }))} /></div>
                          <div className="flex items-end"><Btn variant="success" fullWidth disabled={pagoFormT.monto <= 0} onClick={() => { onRegistrarPagoTrabajo(trabajo.id, { monto: Math.min(pagoFormT.monto, saldo), fecha: pagoFormT.fecha, nota: pagoFormT.nota || undefined }); setPagoFormT({ monto: 0, fecha: hoy, nota: '' }); setExpandidoT(null); }}>✓ Registrar</Btn></div>
                        </div>
                      )}
                      {estado === 'pagado' && <p className="text-xs text-emerald-600 font-semibold text-center">✅ Completamente pagado.</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {facturasFiltradas.length === 0 && legacyFiltrados.length === 0 && (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-3">💰</div>
          <p className="font-medium text-slate-500">
            {clienteSeleccionado
              ? `${clienteSeleccionado.nombre} no tiene registros${filtro !== 'todos' ? ` con estado "${BADGE_ESTADO[filtro as 'pendiente'|'parcial'|'pagado'].label}"` : ''}`
              : filtro === 'todos' ? 'Sin registros' : `Sin registros con estado "${BADGE_ESTADO[filtro as 'pendiente'|'parcial'|'pagado'].label}"`
            }
          </p>
          {clienteSeleccionado && <button type="button" onClick={limpiarFiltroCliente} className="mt-2 text-indigo-600 font-semibold hover:underline text-sm">Ver todos los clientes →</button>}
        </div>
      )}
    </div>
  );
}

// ─── VistaCuentasPorPagar ─────────────────────────────────────────────────────

export function VistaCuentasPorPagar({
  ordenes,
  proveedores,
  onRegistrarPago,
  onIrAOrdenes,
}: {
  ordenes: OrdenCompra[];
  proveedores: Proveedor[];
  onRegistrarPago: (ordenId: string, pago: Omit<PagoCompra, 'id'>) => void;
  onIrAOrdenes: () => void;
}) {
  const hoy = new Date().toISOString().split('T')[0];
  const [expandido, setExpandido] = useState<string | null>(null);
  const [pagoForm, setPagoForm] = useState({ monto: 0, fecha: hoy, metodoPago: 'Efectivo', nota: '' });
  const [filtro, setFiltro] = useState<'todos'|'pendiente'|'parcial'|'pagado'>('todos');
  const [filtroProveedorId, setFiltroProveedorId] = useState('');

  // Only show received POs (they're the ones that create a payable)
  const ordenesPagables = ordenes.filter(o => o.estado === 'recibida');

  const ordenesFiltradas = [...ordenesPagables]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .filter(o => {
      if (filtro !== 'todos' && getEstadoPagoOrden(o) !== filtro) return false;
      if (filtroProveedorId && o.proveedorId !== filtroProveedorId) return false;
      return true;
    });

  const counts = { todos: ordenesPagables.length, pendiente: ordenesPagables.filter(o => getEstadoPagoOrden(o) === 'pendiente').length, parcial: ordenesPagables.filter(o => getEstadoPagoOrden(o) === 'parcial').length, pagado: ordenesPagables.filter(o => getEstadoPagoOrden(o) === 'pagado').length };
  const totalPendiente = ordenesPagables.filter(o => getEstadoPagoOrden(o) !== 'pagado').reduce((s, o) => s + getSaldoOrden(o), 0);

  // Total pagado por proveedor visible en la lista actual
  const totalPagadoPorProveedor = (() => {
    const map: Record<string, number> = {};
    for (const o of ordenesFiltradas) {
      const pagado = getMontoPagadoOrden(o);
      map[o.proveedorId] = (map[o.proveedorId] ?? 0) + pagado;
    }
    return map;
  })();

  const handlePago = (ordenId: string, saldo: number) => {
    if (pagoForm.monto <= 0) return;
    onRegistrarPago(ordenId, {
      monto: Math.min(pagoForm.monto, saldo),
      fecha: pagoForm.fecha,
      metodoPago: pagoForm.metodoPago,
      nota: pagoForm.nota || undefined,
    });
    setPagoForm({ monto: 0, fecha: hoy, metodoPago: 'Efectivo', nota: '' });
    setExpandido(null);
  };

  return (
    <div>
      <SectionTitle title="Cuentas por Pagar" subtitle="Pagos pendientes a proveedores por órdenes de compra recibidas." />

      {ordenesPagables.length === 0 && (
        <div className="text-center py-14 text-slate-400">
          <div className="text-5xl mb-3">🔴</div>
          <p className="font-medium text-slate-500">Sin cuentas por pagar</p>
          <p className="text-sm mt-1">Las cuentas por pagar se generan cuando marcas una OC como recibida.</p>
          <button type="button" onClick={onIrAOrdenes} className="mt-2 text-indigo-600 font-semibold hover:underline text-sm">Ver Órdenes de Compra →</button>
        </div>
      )}

      {ordenesPagables.length > 0 && <>
        {totalPendiente > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-5 flex flex-wrap gap-6 items-center">
            <div><div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Total por Pagar</div>
              <div className="text-2xl font-extrabold text-rose-700">${fmt(totalPendiente)}</div></div>
          </div>
        )}

        {/* Filtro por proveedor */}
        {proveedores.length > 0 && (
          <div className="mb-4">
            <Select
              value={filtroProveedorId}
              onChange={e => setFiltroProveedorId(e.target.value)}
            >
              <option value="">Todos los proveedores</option>
              {proveedores
                .filter(p => ordenesPagables.some(o => o.proveedorId === p.id))
                .map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))
              }
            </Select>
          </div>
        )}

        <div className="flex gap-2 mb-4 flex-wrap">
          {(['todos','pendiente','parcial','pagado'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filtro === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {f === 'todos' ? 'Todas' : BADGE_ESTADO[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        {ordenesFiltradas.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="font-medium">No se encontraron resultados.</p>
          </div>
        ) : (
        <div className="space-y-2">
          {ordenesFiltradas.map(orden => {
            const prov    = proveedores.find(p => p.id === orden.proveedorId);
            const estado  = getEstadoPagoOrden(orden);
            const montoPag = getMontoPagadoOrden(orden);
            const saldo   = getSaldoOrden(orden);
            const badge   = BADGE_ESTADO[estado];
            const isExp   = expandido === orden.id;

            return (
              <div key={orden.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className={`grid grid-cols-1 sm:grid-cols-6 gap-2 items-center px-4 py-3 ${isExp ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'} transition-colors`}>
                  <div className="sm:col-span-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {orden.numeroOrden && <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{orden.numeroOrden}</span>}
                      <span className="font-semibold text-slate-800 text-sm">🏪 {prov?.nombre ?? '—'}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                      <span>{orden.fechaRecibida ? `Recibida: ${new Date(orden.fechaRecibida).toLocaleDateString('es-MX')}` : new Date(orden.fecha).toLocaleDateString('es-MX')}</span>
                      {orden.descripcion && <span>· {orden.descripcion}</span>}
                      <span>· {orden.partes.length} pieza{orden.partes.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Total</div><div className="font-semibold text-slate-800">${fmt(orden.total)}</div></div>
                  <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Pagado</div><div className="font-semibold text-emerald-600">${fmt(montoPag)}</div></div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <div className="text-right"><div className="text-xs text-slate-400 uppercase tracking-wide">Saldo</div><div className={`font-bold ${saldo > 0 ? 'text-rose-600' : 'text-slate-400'}`}>${fmt(saldo)}</div></div>
                    <Btn size="sm" variant={isExp ? 'ghost' : estado !== 'pagado' ? 'success' : 'ghost'}
                      onClick={() => { setExpandido(isExp ? null : orden.id); setPagoForm({ monto: 0, fecha: hoy, metodoPago: 'Efectivo', nota: '' }); }}>
                      {isExp ? '✕' : estado !== 'pagado' ? '+ Pago' : 'Ver'}
                    </Btn>
                  </div>
                </div>

                {isExp && (
                  <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-4">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Piezas recibidas</p>
                      <div className="space-y-1">
                        {orden.partes.map(it => (
                          <div key={it.refaccionId} className="flex justify-between bg-white border border-slate-200 rounded px-3 py-1.5 text-sm">
                            <span className="text-slate-700">{it.nombre} × {it.cantidad}</span>
                            <span className="font-semibold text-slate-800">${fmt(it.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Historial pagos */}
                    {orden.pagos?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Historial de pagos</p>
                        <div className="space-y-1">
                          {orden.pagos.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                              <div className="flex gap-3">
                                <span className="text-slate-500">{new Date(p.fecha).toLocaleDateString('es-MX')}</span>
                                {p.metodoPago && <span className="text-slate-500 font-medium">{p.metodoPago}</span>}
                                {p.nota && <span className="text-slate-500 italic">{p.nota}</span>}
                              </div>
                              <span className="font-semibold text-emerald-600">+ ${fmt(p.monto)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Registrar pago */}
                    {estado !== 'pagado' && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar Pago al Proveedor</p>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                          <div><Label>Fecha</Label><Input type="date" value={pagoForm.fecha} onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))} /></div>
                          <div><Label>Monto ($) — saldo: ${fmt(saldo)}</Label><Input type="number" placeholder="0.00" min="0.01" step="0.01" value={pagoForm.monto || ''} onChange={e => setPagoForm(f => ({ ...f, monto: Number(e.target.value) }))} /></div>
                          <div><Label>Método de pago</Label><Select value={pagoForm.metodoPago} onChange={e => setPagoForm(f => ({ ...f, metodoPago: e.target.value }))}>{['Efectivo','Transferencia','Tarjeta','Cheque','Otro'].map(m => <option key={m}>{m}</option>)}</Select></div>
                          <div><Label>Nota (opcional)</Label><Input type="text" placeholder="Referencia o comentario" value={pagoForm.nota} onChange={e => setPagoForm(f => ({ ...f, nota: e.target.value }))} /></div>
                          <div className="flex items-end"><Btn variant="success" fullWidth disabled={pagoForm.monto <= 0} onClick={() => handlePago(orden.id, saldo)}>✓ Registrar</Btn></div>
                        </div>
                      </div>
                    )}
                    {estado === 'pagado' && <p className="text-xs text-emerald-600 font-semibold text-center">✅ Esta orden está completamente pagada.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

        {/* Total pagado por proveedor visible */}
        {ordenesFiltradas.length > 0 && Object.entries(totalPagadoPorProveedor).filter(([, v]) => v > 0).length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resumen de pagos — proveedores visibles</p>
            {Object.entries(totalPagadoPorProveedor)
              .filter(([, v]) => v > 0)
              .map(([provId, total]) => {
                const prov = proveedores.find(p => p.id === provId);
                return (
                  <div key={provId} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm">
                    <span className="font-semibold text-slate-700">🏪 {prov?.nombre ?? '—'}</span>
                    <span className="font-bold text-emerald-700">
                      Total pagado: ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })
            }
          </div>
        )}
      </>}
    </div>
  );
}
