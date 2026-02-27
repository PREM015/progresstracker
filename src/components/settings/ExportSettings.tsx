'use client';

import React from 'react';

interface ExportSettingsProps {
  className?: string;
}

export const ExportSettings: React.FC<ExportSettingsProps> = ({
  className = '',
}) => {
  const handleExport = (type: string) => {
    fetch(`/api/export/${type}`)
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${type}_${Date.now()}.${type === 'pdf' ? 'pdf' : type}`;
        a.click();
      });
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Export Data</h3>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <div className="font-semibold mb-2">Export All Data</div>
          <div className="text-sm text-gray-600 mb-4">Download all your tracker data and settings</div>
          <div className="flex gap-3">
            {['csv', 'json', 'pdf'].map(format => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 uppercase"
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="font-semibold mb-2">Scheduled Exports</div>
          <div className="text-sm text-gray-600 mb-4">Automatically export data weekly or monthly</div>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Configure Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportSettings;
