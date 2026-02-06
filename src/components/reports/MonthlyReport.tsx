'use client';

import React from 'react';

interface MonthlyReportProps {
  data: {
    month: string;
    totalProblems: number;
    streak: number;
    achievements: number;
    growth: number;
  };
  className?: string;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({
  data,
  className = '',
}) => {
  return (
    <div className={`bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl p-8 ${className}`}>
      <h2 className="text-3xl font-bold mb-6">📈 {data.month} Summary</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/20 backdrop-blur rounded-xl p-6">
          <div className="text-4xl font-bold mb-2">{data.totalProblems}</div>
          <div className="text-sm opacity-90">Total Problems</div>
          <div className="text-xs opacity-75 mt-2">
            {data.growth > 0 ? `↑ ${data.growth}% vs last month` : 'First month!'}
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur rounded-xl p-6">
          <div className="text-4xl font-bold mb-2">🔥 {data.streak}</div>
          <div className="text-sm opacity-90">Day Streak</div>
        </div>

        <div className="bg-white/20 backdrop-blur rounded-xl p-6">
          <div className="text-4xl font-bold mb-2">🏆 {data.achievements}</div>
          <div className="text-sm opacity-90">Achievements Unlocked</div>
        </div>

        <div className="bg-white/20 backdrop-blur rounded-xl p-6 flex items-center justify-center">
          <button className="px-6 py-3 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 font-bold">
            📥 Download Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;
