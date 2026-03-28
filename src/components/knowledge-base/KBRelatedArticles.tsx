// src/components/knowledge-base/KBRelatedArticles.tsx
'use client';

import React from 'react';
import { KBArticleCard } from './KBArticleCard';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  viewCount?: number;
  helpfulYes?: number;
}

interface Props {
  articles: Article[];
  title?: string;
  basePath?: string;
}

export function KBRelatedArticles({ articles, title = 'Related Articles', basePath }: Props) {
  if (!articles.length) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {articles.map((article) => (
          <KBArticleCard key={article.id} article={article} basePath={basePath} />
        ))}
      </div>
    </div>
  );
}

export default KBRelatedArticles;
