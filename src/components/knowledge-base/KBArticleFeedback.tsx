// src/components/knowledge-base/KBArticleFeedback.tsx
'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface Props {
  articleSlug: string;
  initialYes?: number;
  initialNo?: number;
}

export function KBArticleFeedback({ articleSlug, initialYes = 0, initialNo = 0 }: Props) {
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);
  const [yes, setYes] = useState(initialYes);
  const [no, setNo] = useState(initialNo);
  const [loading, setLoading] = useState(false);

  const vote = async (helpful: boolean) => {
    if (voted || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge-base/articles/${articleSlug}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      });
      if (res.ok) {
        setVoted(helpful ? 'yes' : 'no');
        if (helpful) setYes((v) => v + 1);
        else setNo((v) => v + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Was this article helpful?</p>
      {voted ? (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Thanks for your feedback!</p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={() => vote(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
          >
            <ThumbsUp className="h-4 w-4" /> Yes ({yes})
          </button>
          <button
            onClick={() => vote(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <ThumbsDown className="h-4 w-4" /> No ({no})
          </button>
        </div>
      )}
    </div>
  );
}

export default KBArticleFeedback;
