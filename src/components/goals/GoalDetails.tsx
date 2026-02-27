'use client';

import React, { useState, useEffect } from 'react';

interface GoalDetailsProps {
  goalId: string;
  className?: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  targetValue: number;
  currentValue: number;
  deadline: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const GoalDetails: React.FC<GoalDetailsProps> = ({
  goalId,
  className = '',
}) => {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/goals/${goalId}`)
      .then(r => r.json())
      .then(data => setGoal(data))
      .finally(() => setLoading(false));
  }, [goalId]);

  if (loading) {
    return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (!goal) return <div className="text-center text-gray-500">Goal not found</div>;

  const progress = (goal.currentValue / goal.targetValue) * 100;
  const daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-8 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎯</span>
          <h2 className="text-3xl font-bold text-gray-900">{goal.title}</h2>
        </div>
        <p className="text-gray-600 text-lg">{goal.description}</p>
      </div>

      {/* Progress Section */}
      <div className="mb-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Progress</span>
          <span className="text-2xl font-bold text-indigo-600">{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-white rounded-full h-4 mb-3">
          <div
            className="h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{goal.currentValue}</div>
            <div className="text-xs text-gray-600">Current</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{goal.targetValue}</div>
            <div className="text-xs text-gray-600">Target</div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Category</div>
          <div className="font-semibold text-gray-900 capitalize">{goal.category}</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Priority</div>
          <div className={`font-semibold capitalize ${goal.priority === 'high' ? 'text-red-600' :
              goal.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>{goal.priority}</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Deadline</div>
          <div className="font-semibold text-gray-900">
            {new Date(goal.deadline).toLocaleDateString()}
          </div>
          <div className={`text-xs ${daysRemaining < 0 ? 'text-red-600' : 'text-gray-500'}`}>
            {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Status</div>
          <div className="font-semibold text-gray-900 capitalize">{goal.status}</div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Created: {new Date(goal.createdAt).toLocaleDateString()}</span>
          <span>Updated: {new Date(goal.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default GoalDetails;
