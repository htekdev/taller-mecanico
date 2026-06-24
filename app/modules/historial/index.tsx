'use client';

import { useState } from 'react';
import type { Cliente, Vehiculo, Trabajo } from '@/app/types';
import { fmt, BADGE_ESTADO, getEstadoPago } from '@/app/lib/utils';
import { SectionTitle, Input } from '@/app/components/ui';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${dia} ${meses[parseInt(mes, 10) - 1]} ${anio}`;
}

// ─── Pantalla 1: Lista de clientes ────────────────────────────────────────────

function PantallaClientes({
  clientes,
  vehiculos,
  trabajos,
  onSeleccionarCliente,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  trabajos: Trabajo[];
  onSeleccionarCliente: (c: Cliente) => void;
}) {
  const [busqueda, setBusqueda] = useState('');

  const clientesFiltrados = (busqueda.trim()
    ? clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase().trim()))
    : [...clientes]
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <div>
      <SectionTitle
        title="Historial por Unidad"
        subtitle="Selecciona un cliente para ver sus vehículos y el historial de trabajos."
      />

      {/* Buscador */}
      <div className="mb-4 max-w-sm">
        <Input
          type="text"
          placeholder="🔍 Buscar cliente…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {clientes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium text-slate-500">Sin clientes registrados</p>
          <p className="text-sm mt-1">Registra clientes en la pestaña Clientes.</p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <p className="text-sm">No se encontró ningún cliente con ese nombre.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientesFiltrados.map(cliente => {
            const unidades = vehiculos.filter(v => v.clienteId === cliente.id);
            const trabajosCliente = trabajos.filter(t => t.clienteId === cliente.id);
            return (
              <button
                key={cliente.id}
                type="button"
                onClick={() => onSeleccionarCliente(cliente)}
                className="w-full flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-150 text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                    {cliente.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{cliente.nombre}</div>
                    <div className="text-slate-500 text-xs">{cliente.telefono}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-slate-500">
                      {unidades.length} unidad{unidades.length !== 1 ? 'es' : ''}
                    </div>
                    <div className="text-xs text-slate-400">
                      {trabajosCliente.length} trabajo{trabajosCliente.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {unidades.length > 0 ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                      {unidades.length} 🚗
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                      Sin unidades
                    </span>
                  )}
                  <span className="text-slate-300 text-lg">›</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Pantalla 2: Unidades del cliente ─────────────────────────────────────────

function PantallaUnidades({
  cliente,
  vehiculos,
  trabajos,
  onSeleccionarVehiculo,
  onVolver,
}: {
  cliente: Cliente;
  vehiculos: Vehiculo[];
  trabajos: Trabajo[];
  onSeleccionarVehiculo: (v: Vehiculo) => void;
  onVolver: () => void;
}) {
  const unidades = vehiculos.filter(v => v.clienteId === cliente.id);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <button
          type="button"
          onClick={onVolver}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          ‹ Clientes
        </button>
        <span className="text-slate-300 text-sm">/</span>
        <span className="text-sm font-semibold text-slate-700">{cliente.nombre}</span>
      </div>

      {/* Header cliente */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-xl flex-shrink-0">
          {cliente.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-slate-800">{cliente.nombre}</div>
          <div className="text-slate-500 text-sm">{cliente.telefono}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-slate-500">Total trabajos</div>
          <div className="font-bold text-slate-800 text-lg">
            {trabajos.filter(t => t.clienteId === cliente.id).length}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Selecciona una unidad
        </p>
      </div>

      {unidades.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🚗</div>
          <p className="font-medium text-slate-500">Este cliente no tiene unidades registradas</p>
          <p className="text-sm mt-1">Agrega unidades desde la pestaña Clientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {unidades.map(vehiculo => {
            const trabajosVehiculo = trabajos.filter(t => t.vehiculoId === vehiculo.id);
            const ultimoTrabajo = trabajosVehiculo
              .slice()
              .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
            return (
              <button
                key={vehiculo.id}
                type="button"
                onClick={() => onSeleccionarVehiculo(vehiculo)}
                className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-150 text-left group shadow-sm"
              >
                <span className="text-3xl flex-shrink-0 mt-0.5">🚗</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-sm leading-tight">
                    {[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || '(sin datos)'}
                  </div>
                  {vehiculo.placa && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Placa: <span className="font-mono font-semibold text-slate-700">{vehiculo.placa}</span>
                    </div>
                  )}
                  {ultimoTrabajo?.kilometraje != null && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      🛣 Último km: <span className="font-semibold text-slate-700">{ultimoTrabajo.kilometraje.toLocaleString('es-MX')}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      trabajosVehiculo.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {trabajosVehiculo.length} trabajo{trabajosVehiculo.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {ultimoTrabajo && (
                    <div className="text-xs text-slate-400 mt-1">
                      Último: {labelFecha(ultimoTrabajo.fecha)}
                    </div>
                  )}
                </div>
                <span className="text-slate-300 text-lg flex-shrink-0 self-center group-hover:text-indigo-400 transition-colors">›</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Pantalla 3: Historial de trabajos de la unidad ──────────────────────────

function PantallaHistorial({
  cliente,
  vehiculo,
  trabajos,
  onVolverAUnidades,
  onVolverAClientes,
}: {
  cliente: Cliente;
  vehiculo: Vehiculo;
  trabajos: Trabajo[];
  onVolverAUnidades: () => void;
  onVolverAClientes: () => void;
}) {
  const [ordenHistorial, setOrdenHistorial] = useState<'desc' | 'asc'>('desc');

  const trabajosVehiculo = trabajos
    .filter(t => t.vehiculoId === vehiculo.id)
    .slice()
    .sort((a, b) => ordenHistorial === 'desc'
      ? b.fecha.localeCompare(a.fecha)
      : a.fecha.localeCompare(b.fecha)
    );

  const totalGastado = trabajosVehiculo.reduce((s, t) => s + t.total, 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          type="button"
          onClick={onVolverAClientes}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          ‹ Clientes
        </button>
        <span className="text-slate-300 text-sm">/</span>
        <button
          type="button"
          onClick={onVolverAUnidades}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          {cliente.nombre}
        </button>
        <span className="text-slate-300 text-sm">/</span>
        <span className="text-sm font-semibold text-slate-700">
          {[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || 'Unidad'}
        </span>
      </div>

      {/* Header vehículo */}
      <div className="bg-slate-800 text-white rounded-xl px-5 py-4 mb-6 flex items-center gap-4">
        <span className="text-4xl flex-shrink-0">🚗</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg leading-tight">
            {[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || '(sin datos)'}
          </div>
          {vehiculo.placa && (
            <div className="text-slate-300 text-sm font-mono mt-0.5">Placa: {vehiculo.placa}</div>
          )}
          <div className="text-slate-400 text-xs mt-1">{cliente.nombre} · {cliente.telefono}</div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-slate-400 text-xs">Total invertido</div>
          <div className="font-bold text-emerald-400 text-lg">${fmt(totalGastado)}</div>
          <div className="text-slate-400 text-xs">
            {trabajosVehiculo.length} trabajo{trabajosVehiculo.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Lista de trabajos */}
      {trabajosVehiculo.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🔧</div>
          <p className="font-medium text-slate-500">Sin trabajos registrados para esta unidad</p>
          <p className="text-sm mt-1">Los trabajos aparecerán aquí una vez que se registren.</p>
        </div>
      ) : (
        <>
          {/* Ordenamiento */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {trabajosVehiculo.length} trabajo{trabajosVehiculo.length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={() => setOrdenHistorial(o => o === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-all"
            >
              {ordenHistorial === 'desc' ? '↓ Más reciente primero' : '↑ Más antiguo primero'}
            </button>
          </div>
          <div className="space-y-4">
          {trabajosVehiculo.map((trabajo, idx) => {
            const estadoPago = getEstadoPago(trabajo);
            const badge = BADGE_ESTADO[estadoPago];
            const isUltimo = idx === 0;
            return (
              <div
                key={trabajo.id}
                className={`border rounded-xl overflow-hidden ${isUltimo ? 'border-indigo-200' : 'border-slate-200'}`}
              >
                {/* Header del trabajo */}
                <div className={`flex items-center justify-between px-5 py-3 ${isUltimo ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    {isUltimo && (
                      <span className="text-xs font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full">
                        Último
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-700">{labelFecha(trabajo.fecha)}</span>
                    {trabajo.numeroOrden && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full font-mono">
                        # {trabajo.numeroOrden}
                      </span>
                    )}
                    {trabajo.kilometraje != null && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        🛣 {trabajo.kilometraje.toLocaleString('es-MX')} km
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {trabajo.requiereFactura && (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        🧾 Factura
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Cuerpo del trabajo */}
                <div className="px-5 py-4 bg-white">
                  {/* Descripción */}
                  <p className="text-slate-700 text-sm font-medium mb-4">{trabajo.descripcion}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mano de obra */}
                    {(trabajo.manoDeObraItems ?? []).length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                          🔩 Mano de Obra
                        </p>
                        <div className="space-y-1">
                          {(trabajo.manoDeObraItems ?? []).map((item, idx, arr) => {
                            // Fallback: if single item has price 0 but aggregate > 0, use aggregate
                            const displayPrecio = item.precio > 0
                              ? item.precio
                              : arr.length === 1 && trabajo.manoDeObra > 0
                                ? trabajo.manoDeObra
                                : null;
                            return (
                              <div key={item.id} className="flex justify-between items-center text-sm">
                                <span className="text-slate-600">{item.concepto}</span>
                                <span className={`font-semibold ${displayPrecio !== null ? 'text-slate-800' : 'text-slate-400'}`}>
                                  {displayPrecio !== null ? `$${fmt(displayPrecio)}` : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {/* If all items show $0 but aggregate > 0, clarify total */}
                        {(trabajo.manoDeObraItems ?? []).length > 1 &&
                          (trabajo.manoDeObraItems ?? []).every(i => !i.precio) &&
                          trabajo.manoDeObra > 0 && (
                          <p className="text-xs text-slate-400 mt-1 text-right">
                            Total: <strong className="text-slate-600">${fmt(trabajo.manoDeObra)}</strong>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Refacciones */}
                    {(trabajo.partes ?? []).length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                          🔧 Refacciones
                        </p>
                        <div className="space-y-1">
                          {(trabajo.partes ?? []).map((parte, i) => {
                            // Fallback: subtotal → precioVenta×cantidad → null (show "—")
                            const displaySub = parte.subtotal > 0
                              ? parte.subtotal
                              : (parte.precioVenta ?? 0) > 0
                                ? parte.precioVenta * parte.cantidad
                                : null;
                            return (
                              <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 truncate mr-2">
                                  {parte.nombre}
                                  <span className="text-slate-400 text-xs ml-1">×{parte.cantidad}</span>
                                </span>
                                <span className={`font-semibold flex-shrink-0 ${displaySub !== null ? 'text-slate-800' : 'text-slate-400'}`}>
                                  {displaySub !== null ? `$${fmt(displaySub)}` : '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Totales */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
                      {trabajo.manoDeObra > 0 && (
                        <span>Mano de obra: <strong className="text-slate-700">${fmt(trabajo.manoDeObra)}</strong></span>
                      )}
                      {trabajo.refacciones > 0 && (
                        <span>Refacciones: <strong className="text-slate-700">${fmt(trabajo.refacciones)}</strong></span>
                      )}
                      {trabajo.iva > 0 && (
                        <span>IVA: <strong className="text-slate-700">${fmt(trabajo.iva)}</strong></span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-xs text-slate-500">Total</div>
                      <div className="font-bold text-slate-900 text-base">${fmt(trabajo.total)}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Componente principal exportado ───────────────────────────────────────────

export function VistaHistorial({
  clientes,
  vehiculos,
  trabajos,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  trabajos: Trabajo[];
}) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null);

  if (vehiculoSeleccionado && clienteSeleccionado) {
    return (
      <PantallaHistorial
        cliente={clienteSeleccionado}
        vehiculo={vehiculoSeleccionado}
        trabajos={trabajos}
        onVolverAUnidades={() => setVehiculoSeleccionado(null)}
        onVolverAClientes={() => {
          setVehiculoSeleccionado(null);
          setClienteSeleccionado(null);
        }}
      />
    );
  }

  if (clienteSeleccionado) {
    return (
      <PantallaUnidades
        cliente={clienteSeleccionado}
        vehiculos={vehiculos}
        trabajos={trabajos}
        onSeleccionarVehiculo={setVehiculoSeleccionado}
        onVolver={() => setClienteSeleccionado(null)}
      />
    );
  }

  return (
    <PantallaClientes
      clientes={clientes}
      vehiculos={vehiculos}
      trabajos={trabajos}
      onSeleccionarCliente={setClienteSeleccionado}
    />
  );
}
