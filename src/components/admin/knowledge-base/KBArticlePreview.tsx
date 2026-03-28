// src/components/admin/knowledge-base/KBArticlePreview.tsx
'use client';

import React from 'react';
import { KBArticleContent } from '@/components/knowledge-base/KBArticleContent';

interface Props {
  title: string;
  content: string;
  category?: string;
}

export function KBArticlePreview({ title, content, category }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 max-h-[70vh] overflow-y-auto">
      {category && <span className="text-xs text-blue-500 font-semibold uppercase tracking-wider">{category}</span>}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 mb-4">{title || 'Untitled'}</h1>
      <KBArticleContent content={content || '<p><em>Nothing to preview yet.</em></p>'} />
    </div>
  );
}

export default KBArticlePreview;
