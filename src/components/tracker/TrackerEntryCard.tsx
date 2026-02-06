'use client';

import React from 'react';

interface Entry {
  id: string;
  title: string;
  platform: string;
  value: number;
  date: string;
  category: string;
}

interface TrackerEntryCardProps {
  entry: Entry;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const TrackerEntryCard: React.FC<TrackerEntryCardProps> = ({
  entry,
  onEdit,
  onDelete,
  className = '',
}) => {
  const platformIcons: Record<string, string> = {
    leetcode: '💻',
    github: '🐙',
    hackerrank: '🏅',
  };

  return (
    <div className={`bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{platformIcons[entry.platform] || '📊'}</span>
          <div>
            <h4 className="font-bold text-gray-900">{entry.title}</h4>
            <p className="text-sm text-gray-600">{entry.platform}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-indigo-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600">{entry.value}</div>
          <div className="text-xs text-gray-600">Value</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <div className="text-sm font-bold text-purple-600">{new Date(entry.date).toLocaleDateString()}</div>
          <div className="text-xs text-gray-600">Date</div>
        </div>
      </div>

      {entry.category && (
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize">
            {entry.category}
          </span>
        </div>
      )}
    </div>
  );
};

export default TrackerEntryCard;
