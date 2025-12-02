'use client';

import { useState } from 'react';
import  Button  from '@/components/ui/Button';
import  Input  from '@/components/ui/Input';
import  Select  from '@/components/ui/Select';
import { Plus } from 'lucide-react';

interface DailyWorkFieldsProps {
  onSubmit: (data: {
    platform?: string;
    problems: number;
    timeSpent: number;
    notes?: string;
  }) => void;
  platforms?: string[];
  isLoading?: boolean;
}

export function DailyWorkFields({
  onSubmit,
  platforms = [],
  isLoading = false,
}: DailyWorkFieldsProps) {
  const [formData, setFormData] = useState({
    platform: '',
    problems: 0,
    timeSpent: 0,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      timeSpent: formData.timeSpent * 60, // Convert hours to minutes
    });
    // Reset form
    setFormData({
      platform: '',
      problems: 0,
      timeSpent: 0,
      notes: '',
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
    >
      <h3 className="text-lg font-semibold mb-4">Add New Entry</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Platform</label>
          <Select
            value={formData.platform}
            onChange={(e) =>
              setFormData({ ...formData, platform: e.target.value })
            }
          >
            <option value="">Select platform</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
            <option value="other">Other</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Problems Solved
          </label>
          <Input
            type="number"
            min="0"
            value={formData.problems}
            onChange={(e) =>
              setFormData({ ...formData, problems: parseInt(e.target.value) || 0 })
            }
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Time Spent (hours)
          </label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={formData.timeSpent}
            onChange={(e) =>
              setFormData({
                ...formData,
                timeSpent: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="0.0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 invisible">
            Action
          </label>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Plus className="w-4 h-4" />}
            className="w-full"
          >
            Add Entry
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="What did you work on today?"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
          rows={3}
        />
      </div>
    </form>
  );
}