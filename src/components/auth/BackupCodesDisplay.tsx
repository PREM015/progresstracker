// components/auth/BackupCodesDisplay.tsx
'use client';

import React, { useState } from 'react';

interface BackupCodesDisplayProps {
  codes: string[];
  onDownload?: () => void;
  onPrint?: () => void;
}

export default function BackupCodesDisplay({ codes, onDownload, onPrint }: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onDownload?.();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Backup Codes - ProgressTracker</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              h1 { font-size: 18px; margin-bottom: 20px; }
              .code { padding: 10px; margin: 5px 0; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <h1>ProgressTracker - Backup Codes</h1>
            <p>Keep these codes safe. Each code can only be used once.</p>
            ${codes.map(code => `<div class="code">${code}</div>`).join('')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      onPrint?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Save these codes now!
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Each code can only be used once. Store them in a safe place like a password manager.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {codes.map((code, i) => (
          <div
            key={i}
            className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm text-center text-gray-900 dark:text-white"
          >
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          {copied ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </span>
          ) : (
            'Copy All'
          )}
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          Download
        </button>

        <button
          onClick={handlePrint}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          Print
        </button>
      </div>
    </div>
  );
}