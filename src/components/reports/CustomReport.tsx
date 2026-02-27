'use client';

import React, { useState } from 'react';

interface CustomReportProps {
  onGenerate: (config: any) => Promise<void>;
  className?: string;
}

export const CustomReport: React.FC<CustomReportProps> = ({
  onGenerate,
  className = '',
}) => {
  const [config, setConfig] = useState({
    dateRange: 'month',
    metrics: [] as string[],
    platforms: [] as string[],
  });

  const handleGenerate = () => {
    onGenerate(config);
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Create Custom Report</h3>

      <div className="space-y-6">
        <div>
          <label className="block font-medium mb-3">Date Range</label>
          <select
            value={config.dateRange}
            onChange={(e) => setConfig({ ...config, dateRange: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-3">Include Metrics</label>
          <div className="space-y-2">
            {['Total Entries', 'Streak', 'Goals Completed', 'Time Spent'].map(metric => (
              <label key={metric} className="flex items-center gap-3">
                <input type="checkbox" className="w-5 h-5" />
                <span>{metric}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Generate Report
        </button>
      </div>
    </div>
  );
};

export default CustomReport;
