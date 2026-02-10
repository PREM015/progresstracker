'use client';

import React from 'react';
import { useGoals } from '@/hooks/useGoals';
import { FilterState } from './GoalFilters';
import { GoalStatus } from '@/types/goal';

interface GoalsListProps {
  userId: string;
  filters: FilterState;
  className?: string;
}

export const GoalsList: React.FC<GoalsListProps> = ({
  userId,
  filters,
  className = '',
}) => {
  // Cast filters to match useGoals expectation or ensure FilterState aligns
  const { goals, stats, isLoading, error, refetch } = useGoals({
    ...filters,
    status: filters.status as GoalStatus | undefined,
  });

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-600">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Goals</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.completionRate}%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-500">No goals found</p>
            <button className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Create Your First Goal
            </button>
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">{goal.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${goal.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : goal.status === 'active'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                  }`}>
                  {GOAL_STATUS_CONFIG[goal.status]?.label || goal.status}
                </span>
              </div>
              {goal.description && (
                <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Target: {goal.target} {goal.unit}</span>
                <span>•</span>
                <span>Progress: {goal.progress}</span>
                {goal.deadline && (
                  <>
                    <span>•</span>
                    <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Import config for labels
import { GOAL_STATUS_CONFIG } from '@/types/goal';

export default GoalsList;
