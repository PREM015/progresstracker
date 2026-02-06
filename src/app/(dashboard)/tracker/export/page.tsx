"use client";

import { useState } from "react";

export default function TrackerExportPage() {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState('CSV');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        ...dateRange.start && { start: dateRange.start },
        ...dateRange.end && { end: dateRange.end },
      });

      const res = await fetch(`/api/tracker/export?${params}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracker-export.${format.toLowerCase()}`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Export Progress Data</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="CSV">CSV</option>
                <option value="JSON">JSON</option>
                <option value="EXCEL">Excel</option>
                <option value="PDF">PDF Report</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range (Optional)</label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  placeholder="Start Date"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  placeholder="End Date"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-2">What's included:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ All tracked progress entries</li>
                <li>✓ Platform connections and stats</li>
                <li>✓ Goal progress and achievements</li>
                <li>✓ Activity timeline</li>
              </ul>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Download Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
