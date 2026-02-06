'use client';

import React from 'react';

interface GoalProgressProps {
  goalId: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
  showMilestones?: boolean;
  milestones?: Array<{ value: number; label: string }>;
  className?: string;
}

export const GoalProgress: React.FC<GoalProgressProps> = ({
  goalId,
  title,
  currentValue,
  targetValue,
  unit = 'units',
  showMilestones = false,
  milestones = [],
  className = '',
}) => {
  const progress = Math.min((currentValue / targetValue) * 100, 100);
  const remaining = Math.max(targetValue - currentValue, 0);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>

      {/* Progress Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{currentValue}</div>
          <div className="text-xs text-gray-600">Current</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{targetValue}</div>
          <div className="text-xs text-gray-600">Target</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{remaining}</div>
          <div className="text-xs text-gray-600">Remaining</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-indigo-600">{progress.toFixed(1)}%</span>
        </div>
        <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
          {/* Milestones Markers */}
          {showMilestones && milestones.map((milestone, idx) => {
            const milestonePercent = (milestone.value / targetValue) * 100;
            return (
              <div
                key={idx}
                className="absolute top-0 bottom-0 w-0.5 bg-white"
                style={{ left: `${milestonePercent}%` }}
                title={milestone.label}
              />
            );
          })}
        </div>
      </div>

      {/* Milestones List */}
      {showMilestones && milestones.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Milestones</h4>
          <div className="space-y-2">
            {milestones.map((milestone, idx) => {
              const achieved = currentValue >= milestone.value;
              const milestonePercent = (milestone.value / targetValue) * 100;

              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${achieved ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                    {achieved ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${achieved ? 'text-gray-900' : 'text-gray-500'}`}>
                        {milestone.label}
                      </span>
                      <span className="text-xs text-gray-500">{milestone.value} {unit}</span>
                    </div>
                    <div className="text-xs text-gray-400">{milestonePercent.toFixed(0)}% of target</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievement Message */}
      {progress >= 100 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-medium text-center">
            🎉 Goal Achieved! Congratulations!
          </p>
        </div>
      )}
    </div>
  );
};

export default GoalProgress;
