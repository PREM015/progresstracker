// src/components/admin/shared.tsx
'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import Link from 'next/link';

// ============================================
// Types
// ============================================
export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
}

export interface PageProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

// ============================================
// Page wrapper
// ============================================
export function AdminPage({ title, subtitle, action, children }: PageProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-zinc-400 text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ============================================
// Card
// ============================================
export function Card({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      {title && (
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// ============================================
// Stats Card
// ============================================
export function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
    green: 'from-green-500/20 to-green-500/5 border-green-500/20',
    red: 'from-red-500/20 to-red-500/5 border-red-500/20',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
  };

  return (
    <div className={`bg-linear-to-br ${colors[color] || colors.blue} border rounded-xl p-4`}>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

// ============================================
// Table
// ============================================
export function Table<T extends { id: string }>({
  data,
  columns,
  loading,
  onRowClick,
}: {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
}) {
  if (loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;
  if (!data.length) return <div className="p-8 text-center text-zinc-500">No data</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((col) => (
              <th key={String(col.key)} className="text-left p-3 text-sm font-medium text-zinc-400">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {data.map((item) => (
            <tr
              key={item.id}
              className={`hover:bg-zinc-800/50 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="p-3 text-sm text-zinc-300">
                  {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key as string] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// Badge
// ============================================
export function Badge({ children, color = 'zinc' }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    zinc: 'bg-zinc-700 text-zinc-300',
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };
  return <span className={`px-2 py-1 rounded text-xs font-medium ${colors[color]}`}>{children}</span>;
}

// ============================================
// Button
// ============================================
export function Btn({
  children,
  onClick,
  variant = 'default',
  disabled,
  loading,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const variants = {
    default: 'bg-zinc-800 hover:bg-zinc-700 text-white',
    primary: 'bg-white hover:bg-zinc-200 text-black',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${variants[variant]}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}

// ============================================
// Input
// ============================================
export function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <label className="block text-sm text-zinc-400 mb-1">{label}</label>}
      <input
        {...props}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
      />
    </div>
  );
}

// ============================================
// Select
// ============================================
export function Select({
  label,
  options,
  ...props
}: { label?: string; options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <label className="block text-sm text-zinc-400 mb-1">{label}</label>}
      <select
        {...props}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-600"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// Toggle
// ============================================
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-zinc-600'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'left-5' : 'left-1'}`} />
    </button>
  );
}

// ============================================
// Empty state
// ============================================
export function Empty({ message = 'No data', action }: { message?: string; action?: ReactNode }) {
  return (
    <div className="p-12 text-center">
      <p className="text-zinc-500 mb-4">{message}</p>
      {action}
    </div>
  );
}

// ============================================
// Back link
// ============================================
export function BackLink({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-4">
      ← {label}
    </Link>
  );
}

// ============================================
// Data fetching hook
// ============================================
export function useData<T>(url: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, ...deps]);

  return { data, loading, error, refetch, setData };
}

// ============================================
// API action
// ============================================
export async function apiAction(url: string, method = 'POST', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed');
  return json;
}

// ============================================
// Format helpers
// ============================================
export const fmt = {
  date: (d: string) => new Date(d).toLocaleDateString(),
  time: (d: string) => new Date(d).toLocaleString(),
  ago: (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  },
  num: (n: number) => n.toLocaleString(),
};
