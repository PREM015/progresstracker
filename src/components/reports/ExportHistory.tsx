'use client';

import React, { useState, useEffect } from 'react';

interface ExportRecord {
  id: string;
  filename: string;
  format: string;
  createdAt: string;
  size: string;
}

interface ExportHistoryProps {
  className?: string;
}

export const ExportHistory: React.FC<ExportHistoryProps> = ({
  className = '',
}) => {
  const [exports, setExports] = useState<ExportRecord[]>([]);

  useEffect(() => {
    fetch('/api/exports/history')
      .then(r => r.json())
      .then(data => setExports(data));
  }, []);

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Export History</h3>

      <div className="space-y-3">
        {exports.map(exp => (
          <div key={exp.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-semibold">{exp.filename}</div>
              <div className="text-sm text-gray-600">
                {exp.format.toUpperCase()} • {exp.size} • {new Date(exp.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              📥 Download
            </button>
          </div>
        ))}

        {exports.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">📁</span>
            No exports yet
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportHistory;
