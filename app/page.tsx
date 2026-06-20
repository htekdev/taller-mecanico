'use client';

import { useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

interface Vehiculo {
  id: string;
  clienteId: string;
  marca: string;
  modelo: string;
  anio: string;
  placa: string;
}

interface Trabajo {
  id: string;
  clienteId: string;
  vehiculoId: string;
  fecha: string;
  descripcion: string;
  manoDeObra: number;
  refacciones: number;
  total: number;
  estado: 'pendiente' | 'completado' | 'pagado';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function labelVehiculo(v: Vehiculo) {
  const base = [v.anio, v.marca, v.modelo].filter(Boolean).join(' ');
  return v.placa ? `${base} — ${v.placa}` : base;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function TallerMecanico() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [vista, setVista] = useState<'clientes' | 'trabajos' | 'resumen'>('clientes');
  const [mesActual, setMesActual] = useState(new Date().toISOString().slice(0, 7));

  // Cargar datos del localStorage con migración del formato anterior
  useEffect(() => {
    const rawClientes = localStorage.getItem('clientes');
    const rawVehiculos = localStorage.getItem('vehiculos');
    const rawTrabajos = localStorage.getItem('trabajos');

    type ClienteViejo = Cliente & { vehiculo?: string };
    let parsedClientes: ClienteViejo[] = rawClientes ? JSON.parse(rawClientes) : [];
    let parsedVehiculos: Vehiculo[] = rawVehiculos ? JSON.parse(rawVehiculos) : [];
    const parsedTrabajos: Trabajo[] = rawTrabajos ? JSON.parse(rawTrabajos) : [];

    // Migrar formato anterior: Cliente tenía un campo `vehiculo` (string)
    const necesitaMigracion = parsedClientes.some(c => 'vehiculo' in c && c.vehiculo);
    if (necesitaMigracion) {
      const vehiculosMigrados: Vehiculo[] = [];
      parsedClientes = parsedClientes.map(({ vehiculo, ...c }) => {
        if (vehiculo) {
          vehiculosMigrados.push({
            id: `mig_${c.id}`,
            clienteId: c.id,
            marca: vehiculo,
            modelo: '',
            anio: '',
            placa: '',
          });
        }
        return c;
      });
      parsedVehiculos = [...parsedVehiculos, ...vehiculosMigrados];
      localStorage.setItem('clientes', JSON.stringify(parsedClientes));
      localStorage.setItem('vehiculos', JSON.stringify(parsedVehiculos));
    }

    setClientes(parsedClientes);
    setVehiculos(parsedVehiculos);
    setTrabajos(parsedTrabajos);
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

  const guardarTrabajo = (data: Omit<Trabajo, 'id' | 'total'>) => {
    const total = data.manoDeObra + data.refacciones;
    const nuevo: Trabajo = { ...data, id: Date.now().toString(), total };
    const nuevos = [...trabajos, nuevo];
    setTrabajos(nuevos);
    localStorage.setItem('trabajos', JSON.stringify(nuevos));
  };

  const calcularResumen = () => {
    const trabajosMes = trabajos.filter(t => t.fecha.startsWith(mesActual));
    const totalCobrado = trabajosMes.reduce((s, t) => s + t.total, 0);
    const totalRefacciones = trabajosMes.reduce((s, t) => s + t.refacciones, 0);
    const totalManoObra = trabajosMes.reduce((s, t) => s + t.manoDeObra, 0);
    const ganancia = totalCobrado - totalRefacciones;
    return { totalCobrado, totalRefacciones, totalManoObra, ganancia, cantidad: trabajosMes.length };
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="bg-blue-600 text-white p-6 rounded-lg mb-6 shadow-lg">
          <h1 className="text-3xl font-bold">🔧 Taller Mecánico</h1>
          <p className="text-blue-100 mt-1">Sistema de Gestión</p>
        </header>

        <nav className="flex gap-2 mb-6">
          {([
            ['clientes', '👥 Clientes'],
            ['trabajos', '🔧 Trabajos'],
            ['resumen', '📊 Resumen Mensual'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setVista(key)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                vista === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {vista === 'clientes' && (
            <VistaClientes
              clientes={clientes}
              vehiculos={vehiculos}
              onGuardarCliente={guardarCliente}
              onGuardarVehiculo={guardarVehiculo}
            />
          )}
          {vista === 'trabajos' && (
            <VistaTrabajo
              clientes={clientes}
              vehiculos={vehiculos}
              trabajos={trabajos}
              onGuardar={guardarTrabajo}
            />
          )}
          {vista === 'resumen' && (
            <VistaResumen
              mesActual={mesActual}
              setMesActual={setMesActual}
              resumen={calcularResumen()}
              trabajos={trabajos.filter(t => t.fecha.startsWith(mesActual))}
              clientes={clientes}
              vehiculos={vehiculos}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VistaClientes ────────────────────────────────────────────────────────────

function VistaClientes({
  clientes,
  vehiculos,
  onGuardarCliente,
  onGuardarVehiculo,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onGuardarCliente: (c: Omit<Cliente, 'id'>) => void;
  onGuardarVehiculo: (v: Omit<Vehiculo, 'id'>) => void;
}) {
  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '' });
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [formVehiculo, setFormVehiculo] = useState({ marca: '', modelo: '', anio: '', placa: '' });

  const handleSubmitCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (formCliente.nombre && formCliente.telefono) {
      onGuardarCliente(formCliente);
      setFormCliente({ nombre: '', telefono: '' });
    }
  };

  const handleSubmitVehiculo = (e: React.FormEvent, clienteId: string) => {
    e.preventDefault();
    if (formVehiculo.marca && formVehiculo.modelo) {
      onGuardarVehiculo({ ...formVehiculo, clienteId });
      setFormVehiculo({ marca: '', modelo: '', anio: '', placa: '' });
    }
  };

  const toggleCliente = (id: string) => {
    setClienteExpandido(clienteExpandido === id ? null : id);
    setFormVehiculo({ marca: '', modelo: '', anio: '', placa: '' });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Registro de Clientes</h2>
      <p className="text-gray-500 text-sm mb-4">
        Registra al cliente y luego expande su fila para agregar sus unidades (vehículos).
      </p>

      {/* Formulario nuevo cliente */}
      <form onSubmit={handleSubmitCliente} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Nombre del cliente"
          value={formCliente.nombre}
          onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="tel"
          placeholder="Teléfono"
          value={formCliente.telefono}
          onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
        >
          + Agregar Cliente
        </button>
      </form>

      {/* Lista de clientes expandibles */}
      <div className="space-y-2">
        {clientes.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            No hay clientes registrados. Agrega el primero arriba.
          </div>
        )}

        {clientes.map(cliente => {
          const unidades = vehiculos.filter(v => v.clienteId === cliente.id);
          const expandido = clienteExpandido === cliente.id;

          return (
            <div key={cliente.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Fila del cliente */}
              <button
                type="button"
                onClick={() => toggleCliente(cliente.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-semibold text-gray-800">{cliente.nombre}</span>
                  <span className="text-gray-500 text-sm">{cliente.telefono}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    unidades.length > 0
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {unidades.length > 0
                      ? `${unidades.length} unidad${unidades.length !== 1 ? 'es' : ''}`
                      : 'Sin unidades'}
                  </span>
                </div>
                <span className="text-gray-400 text-sm ml-2">{expandido ? '▲ Cerrar' : '▼ Ver / Agregar unidades'}</span>
              </button>

              {/* Panel expandido: unidades + formulario */}
              {expandido && (
                <div className="p-4 bg-white border-t border-gray-200">
                  {/* Unidades existentes */}
                  {unidades.length > 0 && (
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                        🚗 Unidades registradas
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {unidades.map(v => (
                          <div
                            key={v.id}
                            className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2"
                          >
                            <span className="text-xl mt-0.5">🚗</span>
                            <div>
                              <div className="font-medium text-gray-800 text-sm">
                                {[v.anio, v.marca, v.modelo].filter(Boolean).join(' ') || '(sin datos)'}
                              </div>
                              {v.placa && (
                                <div className="text-xs text-gray-500 mt-0.5">Placa: <span className="font-mono">{v.placa}</span></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formulario agregar unidad */}
                  <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    + Registrar nueva unidad
                  </h4>
                  <form
                    onSubmit={e => handleSubmitVehiculo(e, cliente.id)}
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Marca *"
                      value={formVehiculo.marca}
                      onChange={e => setFormVehiculo({ ...formVehiculo, marca: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Modelo *"
                      value={formVehiculo.modelo}
                      onChange={e => setFormVehiculo({ ...formVehiculo, modelo: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Año"
                      value={formVehiculo.anio}
                      onChange={e => setFormVehiculo({ ...formVehiculo, anio: e.target.value })}
                      className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      maxLength={4}
                    />
                    <input
                      type="text"
                      placeholder="Placa"
                      value={formVehiculo.placa}
                      onChange={e => setFormVehiculo({ ...formVehiculo, placa: e.target.value.toUpperCase() })}
                      className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="submit"
                      className="col-span-2 sm:col-span-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold"
                    >
                      + Agregar Unidad
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VistaTrabajo ─────────────────────────────────────────────────────────────

function VistaTrabajo({
  clientes,
  vehiculos,
  trabajos,
  onGuardar,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  trabajos: Trabajo[];
  onGuardar: (t: Omit<Trabajo, 'id' | 'total'>) => void;
}) {
  const [form, setForm] = useState({
    clienteId: '',
    vehiculoId: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    manoDeObra: 0,
    refacciones: 0,
    estado: 'pendiente' as Trabajo['estado'],
  });

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === form.clienteId);

  const handleClienteChange = (clienteId: string) => {
    // Reset vehicle selection when client changes
    setForm(f => ({ ...f, clienteId, vehiculoId: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.clienteId && form.vehiculoId && form.descripcion) {
      onGuardar(form);
      setForm({
        clienteId: '',
        vehiculoId: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        manoDeObra: 0,
        refacciones: 0,
        estado: 'pendiente',
      });
    }
  };

  const getCliente = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Registro de Trabajos</h2>
      <p className="text-gray-500 text-sm mb-4">
        Selecciona el cliente y su unidad, luego registra el trabajo realizado.
      </p>

      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        {/* Paso 1 y 2: Cliente → Unidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              ① Cliente
            </label>
            <select
              value={form.clienteId}
              onChange={e => handleClienteChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              ② Unidad (vehículo)
            </label>
            <select
              value={form.vehiculoId}
              onChange={e => setForm(f => ({ ...f, vehiculoId: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              disabled={!form.clienteId || vehiculosDelCliente.length === 0}
            >
              <option value="">Seleccionar unidad...</option>
              {vehiculosDelCliente.map(v => (
                <option key={v.id} value={v.id}>{labelVehiculo(v)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Aviso si el cliente no tiene unidades */}
        {form.clienteId && vehiculosDelCliente.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
            ⚠️ Este cliente no tiene unidades registradas. Ve a{' '}
            <span className="font-semibold">👥 Clientes</span> y agrega una primero.
          </div>
        )}

        {/* Paso 3: Detalles del trabajo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="sm:col-span-1 lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Descripción del trabajo
            </label>
            <input
              type="text"
              placeholder="Ej. Cambio de aceite, frenos..."
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Mano de obra ($)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={form.manoDeObra || ''}
              onChange={e => setForm(f => ({ ...f, manoDeObra: Number(e.target.value) }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Refacciones ($)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={form.refacciones || ''}
              onChange={e => setForm(f => ({ ...f, refacciones: Number(e.target.value) }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!form.clienteId || !form.vehiculoId}
        >
          + Registrar Trabajo
        </button>
      </form>

      {/* Tabla de trabajos */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Fecha</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Cliente</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Unidad</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Descripción</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Mano de Obra</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Refacciones</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trabajos.map(trabajo => {
              const cliente = getCliente(trabajo.clienteId);
              const vehiculo = getVehiculo(trabajo.vehiculoId);
              return (
                <tr key={trabajo.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    {new Date(trabajo.fecha).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-3 py-3">{cliente?.nombre ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {vehiculo
                      ? <><span>{[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>
                          {vehiculo.placa && <span className="text-xs text-gray-400 ml-1 font-mono">({vehiculo.placa})</span>}</>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-3">{trabajo.descripcion}</td>
                  <td className="px-3 py-3 text-right">${trabajo.manoDeObra.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right">${trabajo.refacciones.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right font-semibold">${trabajo.total.toFixed(2)}</td>
                </tr>
              );
            })}
            {trabajos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No hay trabajos registrados. Agrega el primero arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── VistaResumen ─────────────────────────────────────────────────────────────

function VistaResumen({
  mesActual,
  setMesActual,
  resumen,
  trabajos,
  clientes,
  vehiculos,
}: {
  mesActual: string;
  setMesActual: (m: string) => void;
  resumen: { totalCobrado: number; totalRefacciones: number; totalManoObra: number; ganancia: number; cantidad: number };
  trabajos: Trabajo[];
  clientes: Cliente[];
  vehiculos: Vehiculo[];
}) {
  const getCliente = (id: string) => clientes.find(c => c.id === id);
  const getVehiculo = (id: string) => vehiculos.find(v => v.id === id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Resumen Mensual</h2>
        <input
          type="month"
          value={mesActual}
          onChange={e => setMesActual(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="text-blue-600 text-sm font-semibold mb-1">Total Cobrado</div>
          <div className="text-3xl font-bold text-blue-700">${resumen.totalCobrado.toFixed(2)}</div>
          <div className="text-xs text-blue-500 mt-1">{resumen.cantidad} trabajo{resumen.cantidad !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="text-red-600 text-sm font-semibold mb-1">Gastos Refacciones</div>
          <div className="text-3xl font-bold text-red-700">${resumen.totalRefacciones.toFixed(2)}</div>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="text-green-600 text-sm font-semibold mb-1">Mano de Obra</div>
          <div className="text-3xl font-bold text-green-700">${resumen.totalManoObra.toFixed(2)}</div>
        </div>
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
          <div className="text-emerald-600 text-sm font-semibold mb-1">Ganancia Neta</div>
          <div className="text-3xl font-bold text-emerald-700">${resumen.ganancia.toFixed(2)}</div>
          <div className="text-xs text-emerald-500 mt-1">
            {resumen.totalCobrado > 0
              ? `${((resumen.ganancia / resumen.totalCobrado) * 100).toFixed(1)}% margen`
              : ''}
          </div>
        </div>
      </div>

      {/* Detalle */}
      <h3 className="text-xl font-bold mb-3">Detalle de Trabajos del Mes</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Fecha</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Cliente</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Unidad</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Trabajo</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Cobrado</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Refacciones</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700">Ganancia</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trabajos.map(trabajo => {
              const cliente = getCliente(trabajo.clienteId);
              const vehiculo = getVehiculo(trabajo.vehiculoId);
              return (
                <tr key={trabajo.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    {new Date(trabajo.fecha).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-3 py-3">{cliente?.nombre ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {vehiculo
                      ? [vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')
                      : '—'}
                  </td>
                  <td className="px-3 py-3">{trabajo.descripcion}</td>
                  <td className="px-3 py-3 text-right">${trabajo.total.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right text-red-600">${trabajo.refacciones.toFixed(2)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-green-600">
                    ${(trabajo.total - trabajo.refacciones).toFixed(2)}
                  </td>
                </tr>
              );
            })}
            {trabajos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No hay trabajos en este mes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
