// src/components/knowledge-base/KBCategoryCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface Props {
  category: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    _count?: { articles: number };
  };
}

export function KBCategoryCard({ category }: Props) {
  return (
    <Link
      href={`/support/knowledge-base/${category.slug}`}
      className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 hover:border-blue-400 hover:shadow-md transition-all duration-200 group"
    >
      {category.icon && (
        <div className="text-3xl mb-3">{category.icon}</div>
      )}
      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {category.name}
      </h3>
      {category.description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{category.description}</p>
      )}
      {category._count !== undefined && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          {category._count.articles} article{category._count.articles !== 1 ? 's' : ''}
        </p>
      )}
    </Link>
  );
}

export default KBCategoryCard;
