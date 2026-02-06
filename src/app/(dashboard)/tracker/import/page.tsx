"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackerImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [format, setFormat] = useState('CSV');

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    try {
      await fetch('/api/tracker/import', {
        method: 'POST',
        body: formData,
      });
      router.push('/tracker');
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Import Progress Data</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">File Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="CSV">CSV</option>
                <option value="JSON">JSON</option>
                <option value="EXCEL">Excel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".csv,.json,.xlsx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {file && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-700">
                  <div>File: {file.name}</div>
                  <div>Size: {(file.size / 1024).toFixed(2)} KB</div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">Import Format</h3>
              <p className="text-sm text-blue-800 mb-2">Your file should have these columns:</p>
              <code className="block text-xs text-blue-700">platform, type, value, date</code>
            </div>

            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
