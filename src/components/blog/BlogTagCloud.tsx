// src/components/blog/BlogTagCloud.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  tags: string[];
  selectedTag?: string;
  basePath?: string;
}

export function BlogTagCloud({ tags, selectedTag, basePath = '/blog' }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={basePath}
        className={cn(
          'px-3 py-1 rounded-full text-sm font-medium transition-colors',
          !selectedTag
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
        )}
      >
        All
      </Link>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`${basePath}?tag=${encodeURIComponent(tag)}`}
          className={cn(
            'px-3 py-1 rounded-full text-sm font-medium transition-colors',
            selectedTag === tag
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
          )}
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}

export default BlogTagCloud;
