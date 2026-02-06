'use client';

import React, { useState } from 'react';

interface ShareLinkProps {
  url: string;
  className?: string;
}

export const ShareLink: React.FC<ShareLinkProps> = ({
  url,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <div className="flex gap-3">
        <input
          type="text"
          value={url}
          readOnly
          className="flex-1 px-4 py-2 bg-gray-50 border rounded-lg"
        />
        <button
          onClick={handleCopy}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
    </div>
  );
};

export default ShareLink;
