// src/components/admin/knowledge-base/KBStats.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, FileText, Eye, ThumbsUp, FolderOpen } from 'lucide-react';

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalCategories: number;
  totalViews: number;
  topArticles: Array<{ id: string; title: string; viewCount: number; helpfulYes: number }>;
}

export function KBStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/knowledge-base/stats')
      .then((r) => r.json())
      .then((d) => setStats(d.data))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Articles', value: stats?.totalArticles ?? 0, Icon: FileText, color: 'blue' },
    { label: 'Published', value: stats?.publishedArticles ?? 0, Icon: BookOpen, color: 'green' },
    { label: 'Drafts', value: stats?.draftArticles ?? 0, Icon: FileText, color: 'yellow' },
    { label: 'Categories', value: stats?.totalCategories ?? 0, Icon: FolderOpen, color: 'purple' },
    { label: 'Total Views', value: stats?.totalViews ?? 0, Icon: Eye, color: 'indigo' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className={`inline-flex p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 mb-2`}>
              <Icon className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '—' : value.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {stats?.topArticles && stats.topArticles.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-green-500" /> Top Articles by Views
          </h3>
          <div className="space-y-2">
            {stats.topArticles.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{a.title}</span>
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{a.viewCount.toLocaleString()} views</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default KBStats;
