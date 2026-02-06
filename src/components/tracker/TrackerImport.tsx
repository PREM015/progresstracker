'use client';

import React, { useState } from 'react';

interface TrackerImportProps {
  onSuccess: () => void;
  className?: string;
}

export const TrackerImport: React.FC<TrackerImportProps> = ({
  onSuccess,
  className = '',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await fetch('/api/tracker/import', { method: 'POST', body: formData });
      onSuccess();
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={`bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center ${className}`}>
      <div className="text-6xl mb-4">📥</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Import Tracker Data</h3>
      <p className="text-gray-600 mb-6">Upload a CSV or JSON file</p>

      <input
        type="file"
        accept=".csv,.json"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />

      <button
        onClick={handleImport}
        disabled={!file || importing}
        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {importing ? 'Importing...' : 'Import Data'}
      </button>
    </div>
  );
};

export default TrackerImport;
