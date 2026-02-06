'use client';

import React, { useState } from 'react';

interface EmbedCodeProps {
  widgetId: string;
  title?: string;
  className?: string;
}

export const EmbedCode: React.FC<EmbedCodeProps> = ({
  widgetId,
  title = 'Embed Widget',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe src="https://progresstracker.app/embed/${widgetId}" width="100%" height="400" frameborder="0"></iframe>`;

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-4">{title}</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Embed Code</label>
        <textarea
          readOnly
          value={embedCode}
          className="w-full px-4 py-3 border rounded-lg font-mono text-sm bg-gray-50"
          rows={4}
        />
      </div>

      <button
        onClick={copyCode}
        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        {copied ? '✓ Copied!' : '📋 Copy Embed Code'}
      </button>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-2">Preview</div>
        <div className="border rounded bg-white p-4 text-center text-gray-500">
          Widget preview would appear here
        </div>
      </div>
    </div>
  );
};

export default EmbedCode;
