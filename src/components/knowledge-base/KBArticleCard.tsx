// src/components/knowledge-base/KBArticleCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ThumbsUp, Eye } from 'lucide-react';

interface Props {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    viewCount?: number;
    helpfulYes?: number;
    readTimeMinutes?: number | null;
    category?: { name: string; slug: string } | null;
  };
  basePath?: string;
}

export function KBArticleCard({ article, basePath = '/support/knowledge-base' }: Props) {
  return (
    <Link
      href={`${basePath}/article/${article.slug}`}
      className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-blue-400 hover:shadow-sm transition-all duration-200 group"
    >
      {article.category && (
        <span className="text-xs text-blue-500 font-medium uppercase tracking-wide">{article.category.name}</span>
      )}
      <h3 className="mt-1 font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
        {article.title}
      </h3>
      {article.excerpt && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{article.excerpt}</p>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        {article.viewCount !== undefined && (
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{article.viewCount}</span>
        )}
        {article.helpfulYes !== undefined && (
          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{article.helpfulYes}</span>
        )}
        {article.readTimeMinutes && (
          <span>{article.readTimeMinutes} min read</span>
        )}
      </div>
    </Link>
  );
}

export default KBArticleCard;
