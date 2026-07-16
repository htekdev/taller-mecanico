'use client';

import React from 'react';

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-sm ${props.className ?? ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-sm ${rest.className ?? ''}`}
    >
      {children}
    </select>
  );
}

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  type = 'button',
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-sm',
    ghost:   'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-slate-400',
    danger:  'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 focus:ring-rose-400',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

export function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center">
        <div className="text-slate-400 dark:text-slate-500 text-sm">{message}</div>
      </td>
    </tr>
  );
}
