'use client';

import React from 'react';

interface ChangelogEntryProps {
  version: string;
  date: string;
  changes: {
    type: 'feature' | 'improvement' | 'bugfix';
    description: string;
  }[];
  className?: string;
}

export const ChangelogEntry: React.FC<ChangelogEntryProps> = ({
  version,
  date,
  changes,
  className = '',
}) => {
  const typeConfig = {
    feature: { label: 'New', color: 'bg-green-100 text-green-700' },
    improvement: { label: 'Improved', color: 'bg-blue-100 text-blue-700' },
    bugfix: { label: 'Fixed', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold">v{version}</h3>
        <span className="text-sm text-gray-600">{date}</span>
      </div>

      <ul className="space-y-3">
        {changes.map((change, idx) => {
          const config = typeConfig[change.type];
          return (
            <li key={idx} className="flex items-start gap-3">
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
              <span className="flex-1 text-gray-700">{change.description}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ChangelogEntry;
