'use client';

import React, { useState } from 'react';

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  deadline?: string;
  status: 'active' | 'completed' | 'paused' | 'failed';
  category?: string;
}

interface GoalCardProps {
  goal: Goal;
  className?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  className = '',
  onEdit,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);

  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  const isComplete = goal.status === 'completed' || progress >= 100;
  const isPaused = goal.status === 'paused';
  const isFailed = goal.status === 'failed';

  const statusColors = {
    active: 'border-blue-200 bg-blue-50',
    completed: 'border-green-200 bg-green-50',
    paused: 'border-yellow-200 bg-yellow-50',
    failed: 'border-red-200 bg-red-50',
  };

  const statusIcons = {
    active: '🎯',
    completed: '✅',
    paused: '⏸️',
    failed: '❌',
  };

  const daysRemaining = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      className={`bg-white border-2 rounded-xl p-6 hover:shadow-lg transition-all ${statusColors[goal.status]
        } ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{statusIcons[goal.status]}</span>
            <h3 className="text-lg font-bold text-gray-900">{goal.title}</h3>
          </div>
          {goal.description && (
            <p className="text-sm text-gray-600">{goal.description}</p>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 ml-4">
            {onEdit && (
              <button
                onClick={() => onEdit(goal.id)}
                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                title="Edit goal"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(goal.id)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                title="Delete goal"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold text-gray-900">
            {goal.currentValue} / {goal.targetValue}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : isPaused ? 'bg-yellow-500' : isFailed ? 'bg-red-500' : 'bg-blue-500'
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}% complete</div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        {goal.category && (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {goal.category}
          </span>
        )}
        {daysRemaining !== null && (
          <span
            className={`text-xs font-medium ${daysRemaining < 0
                ? 'text-red-600'
                : daysRemaining <= 7
                  ? 'text-orange-600'
                  : 'text-gray-600'
              }`}
          >
            {daysRemaining < 0
              ? `${Math.abs(daysRemaining)} days overdue`
              : daysRemaining === 0
                ? 'Due today'
                : `${daysRemaining} days left`}
          </span>
        )}
      </div>
    </div>
  );
};

export default GoalCard;
