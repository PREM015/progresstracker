'use client';

import React, { useState, useEffect } from 'react';

interface Entry {
  id: string;
  title: string;
  platform: string;
  value: number;
  date: string;
}

interface TrackerEntryListProps {
  className?: string;
}

export const TrackerEntryList: React.FC<TrackerEntryListProps> = ({
  className = '',
}) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tracker')
      .then(r => r.json())
      .then(data => setEntries(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">All Entries</h3>

      <div className="space-y-3">
        {entries.map(entry => (
          <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
            <div>
              <div className="font-semibold">{entry.title}</div>
              <div className="text-sm text-gray-600">{entry.platform} • {new Date(entry.date).toLocaleDateString()}</div>
            </div>
            <div className="text-2xl font-bold text-indigo-600">{entry.value}</div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">📝</span>
            No entries yet
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackerEntryList;
