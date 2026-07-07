
'use client';

import { useState } from 'react';
import type { Cliente, Vehiculo } from '@/app/types';
import { Label, Input, Btn, SectionTitle } from '@/app/components/ui';

// ── Modal de edición de cliente ────────────────────────────────────────────────
function ModalEditarCliente({
  cliente,
  onGuardar,
  onCerrar,
}: {
  cliente: Cliente;
  onGuardar: (id: string, datos: Omit<Cliente, 'id'>) => Promise<void>;
  onCerrar: () => void;
}) {
  const [form, setForm] = useState({
    nombre: cliente.nombre,
    telefono: cliente.telefono ?? '',
    email: cliente.email ?? '',
    email2: cliente.email2 ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setGuardando(true);
    setErrorMsg(null);
    try {
      await onGuardar(cliente.id, {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        email2: form.email2.trim() || undefined,
      });
      onCerrar();
    } catch {
      setErrorMsg('No se pudo guardar. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCerrar}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Editar Cliente</h2>
            <p className="text-xs text-slate-500 mt-0.5">Actualiza los datos de contacto.</p>
          </div>
          <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-xl 
leading-none" aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input type="text" placeholder="Nombre completo" value={form.nombre} onChange={e => setForm({ ...form, 
nombre: e.target.value })} required />
          </div>
          <div>
            <Label>Teléfono <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
            <Input type="tel" placeholder="Ej. 555-123-4567" value={form.telefono} onChange={e => setForm({ ...form, 
telefono: e.target.value })} />
          </div>
          <div>
            <Label>Correo 1 <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
            <Input type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={e => setForm({ ...form, 
email: e.target.value })} />
          </div>
          <div>
            <Label>Correo 2 <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
            <Input type="email" placeholder="correo2@ejemplo.com" value={form.email2} onChange={e => setForm({ 
...form, email2: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-1">
            <Btn type="button" variant="ghost" fullWidth onClick={onCerrar}>Cancelar</Btn>
            <Btn type="submit" variant="primary" fullWidth disabled={guardando}>{guardando ? 'Guardando...' : '✓ 
Guardar cambios'}</Btn>
          </div>
          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Modal de edición de vehículo ───────────────────────────────────────────────
function ModalEditarVehiculo({
  vehiculo,
  onGuardar,
  onCerrar,
}: {
  vehiculo: Vehiculo;
  onGuardar: (id: string, datos: Pick<Vehiculo, 'marca' | 'modelo' | 'anio' | 'placa'>) => Promise<void>;
  onCerrar: () => void;
}) {
  const [form, setForm] = useState({
    marca: vehiculo.marca ?? '',
    modelo: vehiculo.modelo ?? '',
    anio: vehiculo.anio ?? '',
    placa: vehiculo.placa ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.marca.trim() || !form.modelo.trim()) return;
    setGuardando(true);
    setErrorMsg(null);
    try {
      await onGuardar(vehiculo.id, {
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        anio: form.anio.trim(),
        placa: form.placa.trim().toUpperCase(),
      });
      onCerrar();
    } catch {
      setErrorMsg('No se pudo guardar. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCerrar}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Editar Unidad</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Los cambios se reflejan en todos los trabajos, facturas, historial y reportes relacionados.
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-xl 
leading-none" aria-label="Cerrar">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Marca *</Label>
              <Input
                type="text"
                placeholder="Ej. Isuzu, Ford, VW"
                value={form.marca}
                onChange={e => setForm({ ...form, marca: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Modelo *</Label>
              <Input
                type="text"
                placeholder="Ej. ELF, F-150, Pointer"
                value={form.modelo}
                onChange={e => setForm({ ...form, modelo: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Año <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
              <Input
                type="text"
                placeholder="Ej. 2018"
                value={form.anio}
                onChange={e => setForm({ ...form, anio: e.target.value })}
                maxLength={4}
              />
            </div>
            <div>
              <Label>Placa <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
              <Input
                type="text"
                placeholder="Ej. ABC-123"
                value={form.placa}
                onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            ⚠️ El nombre completo de la unidad se verá como: <strong>{[form.anio, form.marca, 
form.modelo].filter(Boolean).join(' ') || '(vacío)'}</strong>
          </div>
          <div className="flex gap-3 pt-1">
            <Btn type="button" variant="ghost" fullWidth onClick={onCerrar}>Cancelar</Btn>
            <Btn type="submit" variant="primary" fullWidth disabled={guardando || !form.marca.trim() || 
!form.modelo.trim()}>
              {guardando ? 'Guardando...' : '✓ Guardar cambios'}
            </Btn>
          </div>
          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMsg}</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export function VistaClientes({
  clientes,
  vehiculos,
  onGuardarCliente,
  onGuardarVehiculo,
  onActualizarCliente,
  onActualizarVehiculo,
}: {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  onGuardarCliente: (c: Omit<Cliente, 'id'>) => Promise<void>;
  onGuardarVehiculo: (v: Omit<Vehiculo, 'id'>) => Promise<void>;
  onActualizarCliente: (id: string, datos: Omit<Cliente, 'id'>) => Promise<void>;
  onActualizarVehiculo: (id: string, datos: Pick<Vehiculo, 'marca' | 'modelo' | 'anio' | 'placa'>) => Promise<void>;
}) {
  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', email: '', email2: '' });
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [formVehiculo, setFormVehiculo] = useState({ marca: '', modelo: '', anio: '', placa: '' });
  const [busqueda, setBusqueda] = useState('');
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [vehiculoEditando, setVehiculoEditando] = useState<Vehiculo | null>(null);
  const [savingCliente, setSavingCliente] = useState(false);
  const [saveClienteError, setSaveClienteError] = useState<string | null>(null);
  const [savingVehiculo, setSavingVehiculo] = useState<string | null>(null);
  const [saveVehiculoError, setSaveVehiculoError] = useState<string | null>(null);

  const handleSubmitCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCliente.nombre) return;
    setSavingCliente(true);
    setSaveClienteError(null);
    try {
      await onGuardarCliente({
        nombre: formCliente.nombre,
        telefono: formCliente.telefono || undefined,
        email: formCliente.email || undefined,
        email2: formCliente.email2 || undefined,
      });
      setFormCliente({ nombre: '', telefono: '', email: '', email2: '' });
    } catch {
      setSaveClienteError('No se pudo guardar el cliente. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setSavingCliente(false);
    }
  };

  const handleSubmitVehiculo = async (e: React.FormEvent, clienteId: string) => {
    e.preventDefault();
    if (!formVehiculo.marca || !formVehiculo.modelo) return;
    setSavingVehiculo(clienteId);
    setSaveVehiculoError(null);
    try {
      await onGuardarVehiculo({ ...formVehiculo, clienteId });
      setFormVehiculo({ marca: '', modelo: '', anio: '', placa: '' });
    } catch {
      setSaveVehiculoError('No se pudo guardar la unidad. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setSavingVehiculo(null);
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

      {/* ── Modal de edición ── */}
      {clienteEditando && (
        <ModalEditarCliente
          cliente={clienteEditando}
          onGuardar={onActualizarCliente}
          onCerrar={() => setClienteEditando(null)}
        />
      )}

      {/* ── Modal de edición de vehículo ── */}
      {vehiculoEditando && (
        <ModalEditarVehiculo
          vehiculo={vehiculoEditando}
          onGuardar={onActualizarVehiculo}
          onCerrar={() => setVehiculoEditando(null)}
        />
      )}

      {/* ── Formulario nuevo cliente ── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Nuevo Cliente</h3>
        <form onSubmit={handleSubmitCliente} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Nombre *</Label>
            <Input type="text" placeholder="Nombre completo" value={formCliente.nombre}
              onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} required />
          </div>
          <div>
            <Label>Teléfono <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
            <Input type="tel" placeholder="Ej. 555-123-4567" value={formCliente.telefono}
              onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} />
          </div>
          <div>
            <Label>Correo 1 <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
            <Input type="email" placeholder="correo@ejemplo.com" value={formCliente.email}
              onChange={e => setFormCliente({ ...formCliente, email: e.target.value })} />
          </div>
          <div>
            <Label>Correo 2 <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
            <Input type="email" placeholder="correo2@ejemplo.com" value={formCliente.email2}
              onChange={e => setFormCliente({ ...formCliente, email2: e.target.value })} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3 justify-end">
            <Btn type="submit" variant="primary" disabled={savingCliente}>
              {savingCliente ? '⏳ Guardando...' : '+ Agregar Cliente'}
            </Btn>
          </div>
          {saveClienteError && <p className="text-rose-600 text-xs sm:col-span-2 lg:col-span-4">{saveClienteError}</p>}
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
        <div>
          {/* Búsqueda */}
          <div className="mb-4">
            <Input
              type="text"
              placeholder="🔍 Buscar cliente por nombre, teléfono o correo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          {/* Lista filtrada */}
          {(() => {
            const q = busqueda.trim().toLowerCase();
            const filtrados = (q
              ? clientes.filter(c =>
                  c.nombre.toLowerCase().includes(q) ||
                  (c.telefono ?? '').toLowerCase().includes(q) ||
                  (c.email ?? '').toLowerCase().includes(q) ||
                  (c.email2 ?? '').toLowerCase().includes(q)
                )
              : [...clientes]
            ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
            if (filtrados.length === 0) {
              return (
                <div className="text-center py-10 text-slate-400">
                  <p className="font-medium">No se encontraron resultados.</p>
                </div>
              );
            }
            return (
          <div className="space-y-2">
          {filtrados.map(cliente => {
            const unidades = vehiculos.filter(v => v.clienteId === cliente.id);
            const expandido = clienteExpandido === cliente.id;
            return (
              <div key={cliente.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center bg-white hover:bg-slate-50 transition-colors">
                  {/* Clickable area (expand units) */}
                  <button type="button" onClick={() => toggleCliente(cliente.id)}
                    className="flex-1 flex items-center gap-3 px-5 py-4 text-left min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center 
justify-center font-bold text-sm flex-shrink-0">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{cliente.nombre}</div>
                      <div className="text-slate-500 text-xs flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {cliente.telefono && <span>📞 {cliente.telefono}</span>}
                        {cliente.email && <span>✉️ {cliente.email}</span>}
                        {cliente.email2 && <span>✉️ {cliente.email2}</span>}
                        {!cliente.telefono && !cliente.email && <span className="text-slate-400">Sin contacto 
registrado</span>}
                      </div>
                    </div>
                    <span className={`ml-2 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      unidades.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {unidades.length > 0 ? `${unidades.length} unidad${unidades.length !== 1 ? 'es' : ''}` : '⚠ Sin 
unidades'}
                    </span>
                  </button>

                  {/* Editar button */}
                  <div className="flex items-center gap-2 pr-4 flex-shrink-0">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setClienteEditando(cliente); }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 
py-1.5 rounded-lg transition-colors border border-indigo-200 hover:border-indigo-300"
                    >
                      ✏️ Editar
                    </button>
                    <span className="text-slate-400 text-xs font-medium hidden sm:inline">
                      {expandido ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {expandido && (
                  <div className="px-5 pb-5 pt-4 bg-slate-50 border-t border-slate-200">
                    {unidades.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Unidades 
registradas</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {unidades.map(v => (
                            <div key={v.id} className="flex items-center gap-3 bg-white border border-slate-200 
rounded-lg px-4 py-3 shadow-sm">
                              <span className="text-2xl flex-shrink-0">🚗</span>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-800 text-sm truncate">
                                  {[v.anio, v.marca, v.modelo].filter(Boolean).join(' ') || '(sin datos)'}
                                </div>
                                {v.placa && (
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    Placa: <span className="font-mono font-semibold text-slate-700">{v.placa}</span>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setVehiculoEditando(v); }}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 
hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-200 hover:border-indigo-300 
flex-shrink-0"
                                title="Editar unidad"
                              >
                                ✏️
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar nueva 
unidad</p>
                    <form onSubmit={e => handleSubmitVehiculo(e, cliente.id)}
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div><Label>Marca *</Label>
                        <Input type="text" placeholder="Ej. Ford" value={formVehiculo.marca}
                          onChange={e => setFormVehiculo({ ...formVehiculo, marca: e.target.value })} required /></div>
                      <div><Label>Modelo *</Label>
                        <Input type="text" placeholder="Ej. F-150" value={formVehiculo.modelo}
                          onChange={e => setFormVehiculo({ ...formVehiculo, modelo: e.target.value })} required 
/></div>
                      <div><Label>Año</Label>
                        <Input type="text" placeholder="Ej. 2020" value={formVehiculo.anio}
                          onChange={e => setFormVehiculo({ ...formVehiculo, anio: e.target.value })} maxLength={4} 
/></div>
                      <div><Label>Placa</Label>
                        <Input type="text" placeholder="Ej. ABC-123" value={formVehiculo.placa}
                          onChange={e => setFormVehiculo({ ...formVehiculo, placa: e.target.value.toUpperCase() })}
                          className="font-mono" /></div>
                      <div className="col-span-2 sm:col-span-1 flex items-end">
                        <Btn type="submit" variant="success" fullWidth disabled={savingVehiculo === cliente.id}>
                          {savingVehiculo === cliente.id ? '⏳...' : '+ Agregar'}
                        </Btn>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}



