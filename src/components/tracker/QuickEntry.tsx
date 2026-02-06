'use client';

import React, { useState } from 'react';

interface QuickEntryProps {
  onSubmit: (data: QuickEntryData) => Promise<void>;
  className?: string;
}

interface QuickEntryData {
  platform: string;
  value: number;
}

export const QuickEntry: React.FC<QuickEntryProps> = ({
  onSubmit,
  className = '',
}) => {
  const [data, setData] = useState<QuickEntryData>({ platform: 'leetcode', value: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      setData({ platform: 'leetcode', value: 1 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-4">Quick Entry</h3>

      <div className="flex gap-3">
        <select
          value={data.platform}
          onChange={(e) => setData({ ...data, platform: e.target.value })}
          className="flex-1 px-4 py-2 rounded-lg text-gray-900"
        >
          <option value="leetcode">LeetCode</option>
          <option value="github">GitHub</option>
          <option value="hackerrank">HackerRank</option>
        </select>

        <input
          type="number"
          value={data.value}
          onChange={(e) => setData({ ...data, value: parseInt(e.target.value) })}
          className="w-24 px-4 py-2 rounded-lg text-gray-900"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 font-bold disabled:opacity-50"
        >
          {isSubmitting ? '...' : '+'}
        </button>
      </div>
    </form>
  );
};

export default QuickEntry;
