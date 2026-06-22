'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabase';
import type { TallerRow, TallerConRol } from '@/app/lib/supabase';

// ── Types ────────────────────────────────────────────────────

interface AuthContextValue {
  user:        User | null;
  session:     Session | null;
  taller:      TallerConRol | null;
  talleres:    TallerConRol[];
  loading:     boolean;
  authLoading: boolean;
  signIn:      (email: string, password: string) => Promise<string | null>;
  signUp:      (email: string, password: string) => Promise<string | null>;
  signOut:     () => Promise<void>;
  selectTaller: (id: string) => void;
  crearTaller: (nombre: string) => Promise<TallerRow | { error: string } | null>;
  recargarTalleres: () => Promise<TallerConRol[]>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,     setUser]     = useState<User | null>(null);
  const [session,  setSession]  = useState<Session | null>(null);
  const [taller,   setTaller]   = useState<TallerConRol | null>(null);
  const [talleres, setTalleres] = useState<TallerConRol[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // ── Load talleres for the current user (via taller_members join for role info) ──
  const recargarTalleres = useCallback(async () => {
    // Join through taller_members to get ALL talleres the user belongs to
    // (both owned and member-invited) along with their role in each.
    const { data } = await supabase
      .from('taller_members')
      .select('role, talleres(*)')
      .order('created_at', { ascending: true });

    const list: TallerConRol[] = (data ?? []).map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = (item as any).talleres as TallerRow;
      return { ...t, role: item.role as 'owner' | 'mechanic' };
    });
    setTalleres(list);
    return list;
  }, []);

  // ── Bootstrap auth session ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setTaller(null);
        setTalleres([]);
        localStorage.removeItem('taller_id');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load talleres when user logs in ──
  useEffect(() => {
    if (!user) return;
    recargarTalleres().then((list) => {
      const saved = localStorage.getItem('taller_id');
      if (saved) {
        const found = list.find(t => t.id === saved);
        if (found) setTaller(found);
      } else if (list.length === 1) {
        setTaller(list[0]);
        localStorage.setItem('taller_id', list[0].id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Auth actions ──

  const signIn = async (email: string, password: string): Promise<string | null> => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    return error ? error.message : null;
  };

  const signUp = async (email: string, password: string): Promise<string | null> => {
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/setup`,
      },
    });
    setAuthLoading(false);
    return error ? error.message : null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setTaller(null);
    setTalleres([]);
  };

  const selectTaller = (id: string) => {
    const found = talleres.find(t => t.id === id);
    if (found) {
      setTaller(found);
      localStorage.setItem('taller_id', id);
    }
  };

  const crearTaller = async (nombre: string): Promise<TallerRow | { error: string } | null> => {
    if (!user) return null;

    // 1. Insert taller
    const { data: tallerData, error: tallerErr } = await supabase
      .from('talleres')
      .insert({ nombre, created_by: user.id })
      .select()
      .single();

    if (tallerErr || !tallerData) {
      console.error('crearTaller error:', tallerErr);
      // Surface a useful error code to the UI
      return { error: tallerErr?.code ?? 'unknown' };
    }
    const nuevoTaller = tallerData as TallerRow;

    // 2. Add creator as owner member
    await supabase.from('taller_members').insert({
      taller_id: nuevoTaller.id,
      user_id:   user.id,
      role:      'owner',
    });

    const nuevoConRol: TallerConRol = { ...nuevoTaller, role: 'owner' };
    setTalleres(prev => [...prev, nuevoConRol]);
    setTaller(nuevoConRol);
    localStorage.setItem('taller_id', nuevoTaller.id);

    return nuevoTaller;
  };

  return (
    <AuthContext.Provider value={{
      user, session, taller, talleres, loading, authLoading,
      signIn, signUp, signOut, selectTaller, crearTaller, recargarTalleres,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
