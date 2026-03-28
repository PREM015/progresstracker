// src/components/knowledge-base/KBCategoryList.tsx
'use client';

import React from 'react';
import { KBCategoryCard } from './KBCategoryCard';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  _count?: { articles: number };
}

interface Props {
  categories: Category[];
  title?: string;
}

export function KBCategoryList({ categories, title }: Props) {
  return (
    <div>
      {title && <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <KBCategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </div>
  );
}

export default KBCategoryList;
