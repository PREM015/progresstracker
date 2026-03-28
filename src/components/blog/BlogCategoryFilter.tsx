// src/components/blog/BlogCategoryFilter.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Category {
  slug: string;
  name: string;
  _count?: { posts: number };
}

interface Props {
  categories: Category[];
  selectedCategory?: string;
  basePath?: string;
}

export function BlogCategoryFilter({ categories, selectedCategory, basePath = '/blog' }: Props) {
  return (
    <nav className="flex items-center gap-2 overflow-x-auto pb-1">
      <Link
        href={basePath}
        className={cn(
          'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
          !selectedCategory
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        )}
      >
        All Posts
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.slug}
          href={`${basePath}?category=${cat.slug}`}
          className={cn(
            'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
            selectedCategory === cat.slug
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          {cat.name}
          {cat._count !== undefined && <span className="ml-1 opacity-60">({cat._count.posts})</span>}
        </Link>
      ))}
    </nav>
  );
}

export default BlogCategoryFilter;
