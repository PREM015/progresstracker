'use client';

import React from 'react';

interface Goal {
  id: string;
  title: string;
  progress: number;
  target: number;
}

interface ProfileGoalsProps {
  goals: Goal[];
  className?: string;
}

export const ProfileGoals: React.FC<ProfileGoalsProps> = ({
  goals,
  className = '',
}) => {
  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Active Goals</h3>

      <div className="space-y-4">
        {goals.map(goal => {
          const percentage = Math.round((goal.progress / goal.target) * 100);
          return (
            <div key={goal.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{goal.title}</div>
                <div className="text-sm text-gray-600">{goal.progress}/{goal.target}</div>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No active goals
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileGoals;
