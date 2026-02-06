'use client';

import React, { useState } from 'react';

interface ReportGeneratorProps {
  userId: string;
  className?: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  userId,
  className = '',
}) => {
  const [reportType, setReportType] = useState('progress');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: reportType, dateRange }),
      });

      if (!res.ok) throw new Error('Report generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportType}_${Date.now()}.pdf`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-8 ${className}`}>
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Generate Report</h3>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="progress">Progress Report</option>
            <option value="analytics">Analytics Summary</option>
            <option value="achievements">Achievements Report</option>
            <option value="goals">Goals Summary</option>
            <option value="platforms">Platform Activity</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="last_90_days">Last 90 Days</option>
            <option value="this_year">This Year</option>
            <option value="all_time">All Time</option>
          </select>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="font-semibold text-indigo-900 mb-2">📄 Report Contents:</h4>
          <ul className="text-sm text-indigo-700 space-y-1">
            <li>• Detailed statistics and metrics</li>
            <li>• Charts and visualizations</li>
            <li>• Progress over time</li>
            <li>• Platform breakdown</li>
            <li>• Export as PDF</li>
          </ul>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          {isGenerating ? 'Generating Report...' : 'Generate & Download Report'}
        </button>
      </div>
    </div>
  );
};

export default ReportGenerator;
