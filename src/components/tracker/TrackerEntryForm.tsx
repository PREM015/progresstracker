'use client';

import React, { useState } from 'react';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntryInput } from '@/types/tracker';

interface TrackerEntryFormProps {
  onSubmit?: (data: any) => Promise<void>;
  initialData?: Partial<TrackerEntryInput>;
  onCancel?: () => void;
  className?: string;
}

interface EntryData {
  platform: string;
  title: string;
  description: string;
  value: number;
  date: string;
  category: string;
  tags: string[];
}

export const TrackerEntryForm: React.FC<TrackerEntryFormProps> = ({
  onSubmit,
  initialData,
  onCancel,
  className = '',
}) => {
  const { createEntry, isCreating } = useTracker();
  const [formData, setFormData] = useState<Partial<TrackerEntryInput>>({
    platformId: initialData?.platformId || '',
    notes: initialData?.notes || '',
    problemsSolved: initialData?.problemsSolved || 0,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    category: initialData?.category || undefined,
    tags: initialData?.tags || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        await createEntry(formData as any);
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Add Tracker Entry</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <select
              value={formData.platformId}
              onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select platform</option>
              <option value="leetcode">LeetCode</option>
              <option value="github">GitHub</option>
              <option value="hackerrank">HackerRank</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={formData.date as string}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Add brief notes..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Add more details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
            <input
              type="number"
              value={formData.problemsSolved}
              onChange={(e) => setFormData({ ...formData, problemsSolved: parseInt(e.target.value) || 0 })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={formData.category as string}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select category</option>
              <option value="coding">Coding</option>
              <option value="learning">Learning</option>
              <option value="productivity">Productivity</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isCreating}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreating ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default TrackerEntryForm;
