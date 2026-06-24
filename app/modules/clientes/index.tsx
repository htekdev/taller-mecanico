'use client';

import { useState } from 'react';
import type { Cliente, Vehiculo } from '@/app/types';
import { Label, Input, Btn, SectionTitle } from '@/app/components/ui';

export function VistaClientes({
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
  const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', email: '', email2: '' });
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [formVehiculo, setFormVehiculo] = useState({ marca: '', modelo: '', anio: '', placa: '' });
  const [busqueda, setBusqueda] = useState('');

  const handleSubmitCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (formCliente.nombre) {
      onGuardarCliente({
        nombre: formCliente.nombre,
        telefono: formCliente.telefono || undefined,
        email: formCliente.email || undefined,
        email2: formCliente.email2 || undefined,
      });
      setFormCliente({ nombre: '', telefono: '', email: '', email2: '' });
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
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Btn type="submit" variant="primary">+ Agregar Cliente</Btn>
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
                <button type="button" onClick={() => toggleCliente(cliente.id)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{cliente.nombre}</div>
                      <div className="text-slate-500 text-xs flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {cliente.telefono && <span>📞 {cliente.telefono}</span>}
                        {cliente.email && <span>✉️ {cliente.email}</span>}
                        {cliente.email2 && <span>✉️ {cliente.email2}</span>}
                        {!cliente.telefono && !cliente.email && <span className="text-slate-400">Sin contacto registrado</span>}
                      </div>
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
            );
          })()}
        </div>
      )}
    </div>
  );
}
