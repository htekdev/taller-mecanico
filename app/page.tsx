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

function fmt(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-sm ${props.className ?? ''}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-sm ${rest.className ?? ''}`}
    >
      {children}
    </select>
  );
}

function Btn({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  type = 'button',
  onClick,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'ghost';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm',
    ghost:   'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center">
        <div className="text-slate-400 text-sm">{message}</div>
      </td>
    </tr>
  );
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

  const tabs = [
    { key: 'clientes', icon: '👥', label: 'Clientes', count: clientes.length },
    { key: 'trabajos', icon: '🔧', label: 'Trabajos', count: trabajos.length },
    { key: 'resumen',  icon: '📊', label: 'Resumen',  count: null },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
            🔧
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Taller Mecánico</h1>
            <p className="text-slate-400 text-sm font-medium">Sistema de Gestión</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Nav tabs ── */}
        <nav className="flex gap-1 mb-6 bg-white rounded-xl p-1.5 shadow-sm border border-slate-200 w-fit">
          {tabs.map(({ key, icon, label, count }) => (
            <button
              key={key}
              onClick={() => setVista(key)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 ${
                vista === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {count !== null && count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  vista === key ? 'bg-indigo-400 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <Card className="p-6 sm:p-8">
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
        </Card>
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
      <SectionTitle
        title="Registro de Clientes"
        subtitle="Registra al cliente y toca su nombre para gestionar sus unidades (vehículos)."
      />

      {/* ── Formulario nuevo cliente ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Nuevo Cliente</h3>
        <form onSubmit={handleSubmitCliente} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input type="text" placeholder="Nombre completo" value={formCliente.nombre}
              onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} required />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input type="tel" placeholder="Ej. 555-123-4567" value={formCliente.telefono}
              onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} required />
          </div>
          <div className="flex items-end">
            <Btn type="submit" variant="primary" fullWidth>+ Agregar Cliente</Btn>
          </div>
        </form>
      </div>

      {/* ── Lista de clientes ── */}
      {clientes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">👥</div>
          <p className="font-medium text-slate-500">Sin clientes registrados</p>
          <p className="text-sm mt-1">Agrega el primer cliente arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clientes.map(cliente => {
            const unidades = vehiculos.filter(v => v.clienteId === cliente.id);
            const expandido = clienteExpandido === cliente.id;
            return (
              <div key={cliente.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => toggleCliente(cliente.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{cliente.nombre}</div>
                      <div className="text-slate-500 text-xs">{cliente.telefono}</div>
                    </div>
                    <span className={`ml-2 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      unidades.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {unidades.length > 0 ? `${unidades.length} unidad${unidades.length !== 1 ? 'es' : ''}` : '⚠ Sin unidades'}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs font-medium ml-4 flex-shrink-0">
                    {expandido ? '▲ Cerrar' : '▼ Gestionar unidades'}
                  </span>
                </button>

                {expandido && (
                  <div className="px-5 pb-5 pt-4 bg-slate-50 border-t border-slate-200">
                    {unidades.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Unidades registradas</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {unidades.map(v => (
                            <div key={v.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                              <span className="text-2xl flex-shrink-0">🚗</span>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 text-sm truncate">
                                  {[v.anio, v.marca, v.modelo].filter(Boolean).join(' ') || '(sin datos)'}
                                </div>
                                {v.placa && (
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Placa: <span className="font-mono font-semibold text-slate-700">{v.placa}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar nueva unidad</p>
                    <form onSubmit={e => handleSubmitVehiculo(e, cliente.id)}
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div><Label>Marca *</Label>
                        <Input type="text" placeholder="Ej. Ford" value={formVehiculo.marca}
                          onChange={e => setFormVehiculo({ ...formVehiculo, marca: e.target.value })} required /></div>
                      <div><Label>Modelo *</Label>
                        <Input type="text" placeholder="Ej. F-150" value={formVehiculo.modelo}
                          onChange={e => setFormVehiculo({ ...formVehiculo, modelo: e.target.value })} required /></div>
                      <div><Label>Año</Label>
                        <Input type="text" placeholder="Ej. 2020" value={formVehiculo.anio}
                          onChange={e => setFormVehiculo({ ...formVehiculo, anio: e.target.value })} maxLength={4} /></div>
                      <div><Label>Placa</Label>
                        <Input type="text" placeholder="Ej. ABC-123" value={formVehiculo.placa}
                          onChange={e => setFormVehiculo({ ...formVehiculo, placa: e.target.value.toUpperCase() })}
                          className="font-mono" /></div>
                      <div className="col-span-2 sm:col-span-1 flex items-end">
                        <Btn type="submit" variant="success" fullWidth>+ Agregar</Btn>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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
      <SectionTitle title="Registro de Trabajos" subtitle="Selecciona el cliente y su unidad, luego detalla el trabajo realizado." />

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Nuevo Trabajo</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
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
              <span className="flex-shrink-0">⚠️</span>
              <span>Este cliente no tiene unidades. Ve a <span className="font-bold">👥 Clientes</span> para registrar una primero.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required /></div>
            <div><Label>Descripción del trabajo</Label>
              <Input type="text" placeholder="Ej. Cambio de aceite, frenos..." value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required /></div>
            <div><Label>Mano de obra ($)</Label>
              <Input type="number" placeholder="0.00" value={form.manoDeObra || ''}
                onChange={e => setForm(f => ({ ...f, manoDeObra: Number(e.target.value) }))} min="0" step="0.01" /></div>
            <div><Label>Refacciones ($)</Label>
              <Input type="number" placeholder="0.00" value={form.refacciones || ''}
                onChange={e => setForm(f => ({ ...f, refacciones: Number(e.target.value) }))} min="0" step="0.01" /></div>
          </div>

          <Btn type="submit" variant="primary" fullWidth disabled={!form.clienteId || !form.vehiculoId || !form.descripcion}>
            + Registrar Trabajo
          </Btn>
        </form>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3">
          Historial de Trabajos
          {trabajos.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajos.length}</span>}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Fecha','Cliente','Unidad','Descripción','Mano de Obra','Refacciones','Total'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajos.map((trabajo, i) => {
                const cliente = getCliente(trabajo.clienteId);
                const vehiculo = getVehiculo(trabajo.vehiculoId);
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3">
                      {vehiculo ? (
                        <span>
                          <span className="text-slate-700 font-medium">{[vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ')}</span>
                          {vehiculo.placa && <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 font-mono font-semibold px-1.5 py-0.5 rounded">{vehiculo.placa}</span>}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{trabajo.descripcion}</td>
                    <td className="px-4 py-3 text-right text-slate-700">${fmt(trabajo.manoDeObra)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">${fmt(trabajo.refacciones)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">${fmt(trabajo.total)}</td>
                  </tr>
                );
              })}
              {trabajos.length === 0 && <EmptyRow cols={7} message="Sin trabajos registrados. Agrega el primero arriba." />}
            </tbody>
          </table>
        </div>
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <SectionTitle title="Resumen Mensual" />
        <div className="flex-shrink-0">
          <Label>Periodo</Label>
          <Input type="month" value={mesActual} onChange={e => setMesActual(e.target.value)} className="w-auto" />
        </div>
      </div>

      {/* ── Tarjetas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
          <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-2">Total Cobrado</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.totalCobrado)}</div>
          <div className="text-indigo-200 text-xs mt-2">{resumen.cantidad} trabajo{resumen.cantidad !== 1 ? 's' : ''} en el mes</div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-md">
          <div className="text-rose-200 text-xs font-bold uppercase tracking-widest mb-2">Gastos Refacciones</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.totalRefacciones)}</div>
          <div className="text-rose-200 text-xs mt-2">Costo de materiales</div>
        </div>
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl p-5 text-white shadow-md">
          <div className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-2">Mano de Obra</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.totalManoObra)}</div>
          <div className="text-slate-300 text-xs mt-2">Cobrado por servicio</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md">
          <div className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-2">Ganancia Neta</div>
          <div className="text-3xl font-extrabold tracking-tight">${fmt(resumen.ganancia)}</div>
          <div className="text-emerald-200 text-xs mt-2">
            {resumen.totalCobrado > 0 ? `${((resumen.ganancia / resumen.totalCobrado) * 100).toFixed(1)}% margen` : 'Sin movimientos'}
          </div>
        </div>
      </div>

      {/* ── Tabla detalle ── */}
      <div>
        <h3 className="text-base font-bold text-slate-700 mb-3">
          Detalle de Trabajos del Mes
          {trabajos.length > 0 && <span className="ml-2 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{trabajos.length}</span>}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                {['Fecha','Cliente','Unidad','Trabajo','Cobrado','Refacciones','Ganancia'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajos.map((trabajo, i) => {
                const cliente = getCliente(trabajo.clienteId);
                const vehiculo = getVehiculo(trabajo.vehiculoId);
                const ganancia = trabajo.total - trabajo.refacciones;
                return (
                  <tr key={trabajo.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">{new Date(trabajo.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{cliente?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{vehiculo ? [vehiculo.anio, vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') : '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{trabajo.descripcion}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">${fmt(trabajo.total)}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-medium">${fmt(trabajo.refacciones)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">${fmt(ganancia)}</td>
                  </tr>
                );
              })}
              {trabajos.length === 0 && <EmptyRow cols={7} message="No hay trabajos registrados en este mes." />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
