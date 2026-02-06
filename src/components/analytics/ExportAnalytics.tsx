'use client';

import React, { useState } from 'react';

interface ExportAnalyticsProps {
  className?: string;
}

export const ExportAnalytics: React.FC<ExportAnalyticsProps> = ({
  className = '',
}) => {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/analytics/export?format=${format}`);
      if (!res.ok) {
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${Date.now()}.${format}`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Export Analytics</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
          <div className="space-y-2">
            {(['pdf', 'csv', 'json'] as const).map((fmt) => (
              <label key={fmt} className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="format"
                  value={fmt}
                  checked={format === fmt}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-gray-900 uppercase">{fmt}</div>
                  <div className="text-xs text-gray-600">
                    {fmt === 'pdf' && 'Full report with charts and visualizations'}
                    {fmt === 'csv' && 'Spreadsheet format for data analysis'}
                    {fmt === 'json' && 'Raw data for developers'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {isExporting ? 'Exporting...' : 'Export Analytics'}
        </button>
      </div>
    </div>
  );
};

export default ExportAnalytics;
