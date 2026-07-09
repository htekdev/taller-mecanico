'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/auth';
import * as db from '@/app/lib/db';
import type { TallerInvite, TallerMember } from '@/app/lib/db';

// ── Tipos ─────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  owner:    '👑 Dueño',
  mechanic: '🔧 Mecánico',
};

// ── Componente principal ──────────────────────────────────────

export function VistaConfiguracion() {
  const { taller, user } = useAuth();

  const [members,  setMembers]  = useState<TallerMember[]>([]);
  const [invites,  setInvites]  = useState<TallerInvite[]>([]);
  const [email,    setEmail]    = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensaje,  setMensaje]  = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Track which member's role is being updated (memberId → loading state)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [roleMensaje, setRoleMensaje]   = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // ── Load members & invites ──

  const cargar = useCallback(async () => {
    if (!taller) return;
    setCargando(true);
    try {
      const [m, i] = await Promise.all([
        db.getMembers(taller.id),
        db.getInvites(taller.id),
      ]);
      setMembers(m);
      setInvites(i);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: '⚠️ No se pudieron cargar los datos. Verifica tu conexión e intenta de nuevo.' });
      console.error('[configuracion] cargar error:', err);
    } finally {
      setCargando(false);
    }
  }, [taller]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Invite ──

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taller || !user || !email.trim()) return;

    setEnviando(true);
    setMensaje(null);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      const result = await db.sendInvite(taller.id, trimmedEmail, user.id);

      if (result === null) {
        setMensaje({
          tipo: 'error',
          texto: `⚠️ Ya existe una invitación pendiente para ${trimmedEmail}.`,
        });
      } else {
        setMensaje({
          tipo: 'ok',
          texto: `✅ Invitación creada para ${result.email}. Cuando esa persona inicie sesión, verá este taller automáticamente.`,
        });
        setEmail('');
        await cargar();
      }
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: '⚠️ No se pudo enviar la invitación. Verifica tu conexión e intenta de nuevo.',
      });
      console.error('[configuracion] sendInvite error:', err);
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelarInvite = async (inviteId: string) => {
    try {
      await db.cancelInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      setMensaje({ tipo: 'error', texto: '⚠️ No se pudo cancelar la invitación. Verifica tu conexión e intenta de nuevo.' });
      console.error('[configuracion] cancelInvite error:', err);
    }
  };

  // ── Role editing ──

  // Determine if current user is an owner in this taller
  const isOwner = members.some(m => m.userId === user?.id && m.role === 'owner');

  const handleCambiarRol = async (member: TallerMember, newRole: 'owner' | 'mechanic') => {
    if (!taller || newRole === member.role) return;

    setUpdatingRole(member.id);
    setRoleMensaje(null);

    try {
      const ok = await db.updateMemberRole(member.id, taller.id, newRole);

      if (ok) {
        setMembers(prev => prev.map(m =>
          m.id === member.id ? { ...m, role: newRole } : m,
        ));
        setRoleMensaje({
          tipo: 'ok',
          texto: `✅ Rol de ${displayEmail(member)} actualizado a ${ROLE_LABEL[newRole]}.`,
        });
      } else {
        setRoleMensaje({
          tipo: 'error',
          texto: `⚠️ No se pudo cambiar el rol. Solo los dueños pueden editar roles.`,
        });
      }
    } catch (err) {
      setRoleMensaje({
        tipo: 'error',
        texto: '⚠️ No se pudo cambiar el rol. Verifica tu conexión e intenta de nuevo.',
      });
      console.error('[configuracion] handleCambiarRol error:', err);
    } finally {
      setUpdatingRole(null);
    }
  };

  if (!taller) return null;

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">⚙️ Configuración del Taller</h2>
        <p className="text-sm text-slate-500 mt-1">{taller.nombre}</p>
      </div>

      {/* ── Miembros actuales ───────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-700 mb-4">👥 Miembros del Taller</h3>

        {roleMensaje && (
          <div className={`mb-3 px-4 py-3 rounded-xl text-sm ${
            roleMensaje.tipo === 'ok'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}>
            {roleMensaje.texto}
          </div>
        )}

        {cargando ? (
          <p className="text-sm text-slate-400">Cargando miembros...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-400">No hay miembros registrados.</p>
        ) : (
          <ul className="space-y-2">
            {members.map(m => {
              const esYo = m.userId === user?.id;
              const displayName = m.email
                ?? (esYo ? user?.email : null)
                ?? `usuario-${m.userId.slice(0, 8)}`;

              return (
                <li key={m.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {displayName}
                      {esYo && (
                        <span className="ml-2 text-xs text-indigo-500 font-normal">(tú)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Agregado: {new Date(m.createdAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>

                  {/* Role — dropdown for owners, badge for non-owners */}
                  {isOwner ? (
                    <select
                      value={m.role}
                      disabled={updatingRole === m.id}
                      onChange={e => handleCambiarRol(m, e.target.value as 'owner' | 'mechanic')}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                        m.role === 'owner'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <option value="owner">👑 Dueño</option>
                      <option value="mechanic">🔧 Mecánico</option>
                    </select>
                  ) : (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      m.role === 'owner'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {isOwner && !cargando && members.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            💡 Como dueño puedes cambiar el rol de cualquier miembro. Se permiten múltiples dueños.
          </p>
        )}
      </section>

      {/* ── Invitar miembro ─────────────────────────────── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-700 mb-1">✉️ Invitar Miembro</h3>
        <p className="text-xs text-slate-500 mb-4">
          Ingresa el correo de la persona que quieres agregar. La próxima vez que inicie sesión,
          verá este taller automáticamente.
        </p>

        <form onSubmit={handleInvitar} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm"
          />
          <button
            type="submit"
            disabled={enviando || !email.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm whitespace-nowrap"
          >
            {enviando ? 'Enviando...' : 'Invitar'}
          </button>
        </form>

        {/* Feedback message */}
        {mensaje && (
          <div className={`mt-3 px-4 py-3 rounded-xl text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}>
            {mensaje.texto}
          </div>
        )}
      </section>

      {/* ── Invitaciones pendientes ──────────────────────── */}
      {invites.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-700 mb-4">🕐 Invitaciones Pendientes</h3>
          <ul className="space-y-2">
            {invites.map(inv => (
              <li key={inv.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-amber-50 border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{inv.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Invitado: {new Date(inv.createdAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
                <button
                  onClick={() => handleCancelarInvite(inv.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 border border-rose-200 hover:border-rose-400 px-3 py-1.5 rounded-lg transition-colors">
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function displayEmail(m: TallerMember): string {
  return m.email ?? `usuario-${m.userId.slice(0, 8)}`;
}

