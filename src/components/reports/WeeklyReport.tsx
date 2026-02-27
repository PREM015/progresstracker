'use client';

import React from 'react';

interface WeeklyReportProps {
  data: {
    week: string;
    totalProblems: number;
    hoursStudied: number;
    goalsCompleted: number;
    topPlatforms: Array<{ name: string; count: number }>;
  };
  className?: string;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({
  data,
  className = '',
}) => {
  return (
    <div className={`bg-white border rounded-xl p-8 ${className}`}>
      <h2 className="text-2xl font-bold mb-6">📊 Week of {data.week}</h2>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-indigo-50 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-indigo-600">{data.totalProblems}</div>
          <div className="text-sm text-gray-600 mt-2">Problems Solved</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-purple-600">{data.hoursStudied}h</div>
          <div className="text-sm text-gray-600 mt-2">Hours Studied</div>
        </div>
        <div className="bg-green-50 rounded-xl p-6 text-center">
          <div className="text-4xl font-bold text-green-600">{data.goalsCompleted}</div>
          <div className="text-sm text-gray-600 mt-2">Goals Completed</div>
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-4">Top Platforms</h3>
        <div className="space-y-2">
          {data.topPlatforms.map(platform => (
            <div key={platform.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">{platform.name}</span>
              <span className="font-bold text-indigo-600">{platform.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;
