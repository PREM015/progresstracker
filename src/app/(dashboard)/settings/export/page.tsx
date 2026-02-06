"use client";

import { useState } from "react";

export default function ExportDataPage() {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/user/export?format=${exportFormat}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progresstracker-data.${exportFormat}`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Export Your Data</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <p className="text-gray-700 mb-6">
            Download a complete copy of all your data including goals, achievements, progress tracking,
            and platform connections. Your data will be provided in the format you select below.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF Report</option>
            </select>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-900 mb-2">What's included:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ Profile information</li>
              <li>✓ All goals and progress</li>
              <li>✓ Achievement history</li>
              <li>✓ Platform connections and stats</li>
              <li>✓ Activity timeline</li>
              <li>✓ Settings and preferences</li>
            </ul>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {exporting ? 'Preparing Export...' : 'Download My Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
