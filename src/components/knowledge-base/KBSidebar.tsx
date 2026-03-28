// src/components/knowledge-base/KBSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  _count?: { articles: number };
}

interface Props {
  categories: Category[];
  currentSlug?: string;
  basePath?: string;
}

export function KBSidebar({ categories, currentSlug, basePath = '/support/knowledge-base' }: Props) {
  return (
    <aside className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-3">Categories</h3>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`${basePath}/${cat.slug}`}
          className={cn(
            'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
            currentSlug === cat.slug
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <span className="flex items-center gap-2">
            {cat.icon && <span>{cat.icon}</span>}
            {cat.name}
          </span>
          {cat._count !== undefined && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{cat._count.articles}</span>
          )}
        </Link>
      ))}
    </aside>
  );
}

export default KBSidebar;
