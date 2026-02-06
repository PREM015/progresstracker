'use client';

import React, { useState } from 'react';

interface ComparisonToolsProps {
  onCompare: (comparison: ComparisonConfig) => void;
  className?: string;
}

interface ComparisonConfig {
  period1: string;
  period2: string;
  metric: string;
}

export const ComparisonTools: React.FC<ComparisonToolsProps> = ({
  onCompare,
  className = '',
}) => {
  const [config, setConfig] = useState<ComparisonConfig>({
    period1: 'this_month',
    period2: 'last_month',
    metric: 'problems_solved',
  });

  const handleCompare = () => {
    onCompare(config);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Compare Periods</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period 1</label>
            <select
              value={config.period1}
              onChange={(e) => setConfig({ ...config, period1: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period 2</label>
            <select
              value={config.period2}
              onChange={(e) => setConfig({ ...config, period2: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="last_week">Last Week</option>
              <option value="last_month">Last Month</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="last_year">Last Year</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metric to Compare</label>
          <select
            value={config.metric}
            onChange={(e) => setConfig({ ...config, metric: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="problems_solved">Problems Solved</option>
            <option value="commits">Commits</option>
            <option value="time_spent">Time Spent</option>
            <option value="streak_days">Streak Days</option>
            <option value="points_earned">Points Earned</option>
          </select>
        </div>

        <button
          onClick={handleCompare}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          Compare Periods
        </button>
      </div>
    </div>
  );
};

export default ComparisonTools;
