// src/components/knowledge-base/KBArticleContent.tsx
'use client';

import React from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

interface Props {
  content: string;
}

export function KBArticleContent({ content }: Props) {
  return (
    <div
      className="prose prose-gray dark:prose-invert max-w-none
        prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
        prose-p:text-gray-700 dark:prose-p:text-gray-300
        prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:rounded prose-code:px-1 prose-code:py-0.5
        prose-pre:bg-gray-900 prose-pre:text-gray-100
        prose-blockquote:border-l-blue-500 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
        prose-img:rounded-xl"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  );
}

export default KBArticleContent;
