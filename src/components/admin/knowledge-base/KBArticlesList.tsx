// src/components/admin/knowledge-base/KBArticlesList.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Eye, Globe, FileText } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  viewCount: number;
  updatedAt: string;
  category?: { name: string } | null;
}

interface Props {
  categoryId?: string;
  status?: string;
}

export function KBArticlesList({ categoryId, status }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (categoryId) params.set('categoryId', categoryId);
    if (status) params.set('status', status);
    const res = await fetch(`/api/admin/knowledge-base/articles?${params}`);
    if (res.ok) setArticles((await res.json()).data?.articles ?? []);
    setLoading(false);
  }, [categoryId, status]);

  useEffect(() => { load(); }, [load]);

  const deleteArticle = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    await fetch(`/api/admin/knowledge-base/articles/${id}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className="text-center text-gray-400 py-8 text-sm">Loading…</div>;
  if (!articles.length) return <div className="text-center text-gray-400 py-8 text-sm">No articles found.</div>;

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {articles.map((a) => (
        <div key={a.id} className="flex items-center gap-3 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.title}</p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
              {a.category && <span>{a.category.name}</span>}
              <span>·</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{a.viewCount}</span>
              <span>·</span>
              <span>{new Date(a.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
            a.status === 'PUBLISHED' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              : a.status === 'DRAFT' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
          }`}>
            {a.status === 'PUBLISHED' ? <Globe className="h-3 w-3 inline mr-1" /> : <FileText className="h-3 w-3 inline mr-1" />}
            {a.status}
          </span>
          <Link href={`/admin/knowledge-base/${a.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors">
            <Pencil className="h-4 w-4" />
          </Link>
          <button onClick={() => deleteArticle(a.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default KBArticlesList;
