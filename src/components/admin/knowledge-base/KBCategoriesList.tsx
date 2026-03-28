// src/components/admin/knowledge-base/KBCategoriesList.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, FolderOpen } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  _count: { articles: number };
}

interface Props {
  onEdit?: (cat: Category) => void;
}

export function KBCategoriesList({ onEdit }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch('/api/admin/knowledge-base/categories');
    if (res.ok) setCategories((await res.json()).data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await fetch(`/api/admin/knowledge-base/categories/${id}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {categories.map((cat) => (
        <div key={cat.id} className="flex items-center justify-between py-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FolderOpen className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{cat.name}</p>
              <p className="text-xs text-gray-400">{cat._count.articles} articles · /{cat.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.isActive ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
              {cat.isActive ? 'Active' : 'Hidden'}
            </span>
            <button onClick={() => onEdit?.(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default KBCategoriesList;
