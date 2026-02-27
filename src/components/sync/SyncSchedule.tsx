'use client';

import React, { useState } from 'react';

interface SyncScheduleProps {
  className?: string;
}

export const SyncSchedule: React.FC<SyncScheduleProps> = ({
  className = '',
}) => {
  const [frequency, setFrequency] = useState<'manual' | 'hourly' | 'daily' | 'weekly'>('hourly');

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Sync Schedule</h3>

      <div className="space-y-4">
        {(['manual', 'hourly', 'daily', 'weekly'] as const).map((freq) => (
          <label key={freq} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="frequency"
              value={freq}
              checked={frequency === freq}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-5 h-5"
            />
            <div>
              <div className="font-semibold capitalize">{freq}</div>
              <div className="text-sm text-gray-600">
                {freq === 'manual' && 'Only sync when you trigger it'}
                {freq === 'hourly' && 'Sync every hour automatically'}
                {freq === 'daily' && 'Sync once per day at midnight'}
                {freq === 'weekly' && 'Sync once per week on Monday'}
              </div>
            </div>
          </label>
        ))}
      </div>

      <button className="w-full mt-6 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
        Save Schedule
      </button>
    </div>
  );
};

export default SyncSchedule;
