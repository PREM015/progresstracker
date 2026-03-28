// src/components/admin/knowledge-base/KBCategoryForm.tsx
'use client';

import React, { useState } from 'react';

interface Category {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

interface Props {
  initial?: Category;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function KBCategoryForm({ initial, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    description: initial?.description ?? '',
    icon: initial?.icon ?? '',
    sortOrder: initial?.sortOrder ?? 0,
    isActive: initial?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const field = (key: keyof typeof form) => ({
    value: (form[key] as string | number) as any,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked
        : e.target.type === 'number' ? Number(e.target.value)
        : e.target.value;
      setForm((f) => ({ ...f, [key]: val }));
    },
  });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const url = initial?.id ? `/api/admin/knowledge-base/categories/${initial.id}` : '/api/admin/knowledge-base/categories';
      const method = initial?.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input {...field('name')} placeholder="Category name *" required className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input {...field('icon')} placeholder="Icon (emoji or code)" className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <input {...field('slug')} placeholder="Slug (auto-generated if empty)" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <textarea {...field('description')} placeholder="Description" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="flex items-center gap-4">
        <input type="number" {...field('sortOrder')} placeholder="Sort order" className="w-28 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
          Active
        </label>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>}
        <button onClick={save} disabled={saving || !form.name} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : initial?.id ? 'Update' : 'Create Category'}
        </button>
      </div>
    </div>
  );
}

export default KBCategoryForm;
