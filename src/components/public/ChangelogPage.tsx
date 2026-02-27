'use client';

import React, { useEffect, useState } from 'react';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  type: string;
  changes: Array<{ type: string; description: string }> | any;
  publishedAt: string | null;
}

interface ChangelogPageProps {
  className?: string;
}

export const ChangelogPage: React.FC<ChangelogPageProps> = ({
  className = '',
}) => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/public/changelog?limit=20');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch changelog');
        setEntries(json?.entries || []);
      } catch (err) {
        console.error(err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, []);

  const labelFor = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'feature' || t === 'added') return { text: 'New', cls: 'bg-green-100 text-green-700' };
    if (t === 'improvement' || t === 'changed') return { text: 'Improved', cls: 'bg-blue-100 text-blue-700' };
    if (t === 'security') return { text: 'Security', cls: 'bg-yellow-100 text-yellow-700' };
    return { text: 'Fixed', cls: 'bg-red-100 text-red-700' };
  };

  return (
    <div className={`min-h-screen bg-gray-50 py-12 ${className}`}>
      <div className="container mx-auto px-6 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Changelog</h1>
        <p className="text-gray-600 mb-12">Track all updates and improvements</p>

        <div className="space-y-6">
          {loading ? (
            <div className="text-center text-gray-500">Loading changelog...</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-gray-500">No entries published</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="bg-white border rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">v{entry.version}</h2>
                  <span className="text-gray-600">
                    {entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="text-gray-700 font-medium mb-2">{entry.title}</div>
                <div className="text-gray-600 mb-4">{entry.description}</div>
                <ul className="space-y-2">
                  {Array.isArray(entry.changes) ? entry.changes.map((change, idx) => {
                    const badge = labelFor(change.type || entry.type);
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${badge.cls}`}>
                          {badge.text}
                        </span>
                        <span>{change.description || change.text || ''}</span>
                      </li>
                    );
                  }) : null}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangelogPage;
