'use client';

import React, { useState } from 'react';
import { ExportService } from '@/services/api/export.service';

interface TrackerExportProps {
  className?: string;
}

export const TrackerExport: React.FC<TrackerExportProps> = ({
  className = '',
}) => {
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await ExportService.generate({ format });
      const blob = await ExportService.download(result.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracker_export_${Date.now()}.${format}`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-4">Export Data</h3>

      <div className="space-y-4">
        <div className="flex gap-3">
          {(['csv', 'json', 'pdf'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-4 py-2 rounded-lg ${format === fmt ? 'bg-indigo-600 text-white' : 'bg-gray-100'
                }`}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : '📥 Export Data'}
        </button>
      </div>
    </div>
  );
};

export default TrackerExport;
