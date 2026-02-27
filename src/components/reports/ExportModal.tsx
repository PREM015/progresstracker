'use client';

import React, { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string) => Promise<void>;
  className?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  className = '',
}) => {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport(format);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-2xl p-8 max-w-md w-full ${className}`}>
        <h3 className="text-2xl font-bold mb-6">Export Report</h3>

        <div className="space-y-4 mb-6">
          <label className="block font-medium mb-3">Select Format</label>
          {(['pdf', 'csv', 'xlsx'] as const).map(fmt => (
            <label key={fmt} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="format"
                value={fmt}
                checked={format === fmt}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-5 h-5"
              />
              <div>
                <div className="font-semibold uppercase">{fmt}</div>
                <div className="text-sm text-gray-600">
                  {fmt === 'pdf' && 'Portable Document Format'}
                  {fmt === 'csv' && 'Comma-Separated Values'}
                  {fmt === 'xlsx' && 'Excel Spreadsheet'}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
