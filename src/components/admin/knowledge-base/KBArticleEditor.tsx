// src/components/admin/knowledge-base/KBArticleEditor.tsx
'use client';

import React, { useState } from 'react';
import { Save, Eye } from 'lucide-react';

interface Article {
  id?: string;
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  categoryId?: string;
  status?: string;
  isFeatured?: boolean;
  tags?: string[];
  readTimeMinutes?: number;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  article?: Article;
  categories: Category[];
  onSave?: (article: Article) => void;
}

export function KBArticleEditor({ article, categories, onSave }: Props) {
  const [form, setForm] = useState<Article>({
    title: article?.title ?? '',
    slug: article?.slug ?? '',
    content: article?.content ?? '',
    excerpt: article?.excerpt ?? '',
    categoryId: article?.categoryId ?? categories[0]?.id ?? '',
    status: article?.status ?? 'DRAFT',
    isFeatured: article?.isFeatured ?? false,
    tags: article?.tags ?? [],
    readTimeMinutes: article?.readTimeMinutes,
  });
  const [tagsInput, setTagsInput] = useState((article?.tags ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean) };
      const url = article?.id ? `/api/admin/knowledge-base/articles/${article.id}` : '/api/admin/knowledge-base/articles';
      const method = article?.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const data = await res.json();
      onSave?.(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Article) => ({
    value: (form[key] ?? '') as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="space-y-4">
      <input {...field('title')} placeholder="Article title" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xl font-bold placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select {...field('categoryId')} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select {...field('status')} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <input {...field('slug')} placeholder="Slug (auto-generated)" className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <textarea {...field('excerpt')} placeholder="Short excerpt…" rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <textarea value={form.content ?? ''} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="Article content (HTML supported)…" rows={16} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white resize-y font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags (comma separated)" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Eye className="h-4 w-4" /> Preview
        </button>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Article'}
        </button>
      </div>
    </div>
  );
}

export default KBArticleEditor;
