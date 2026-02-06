'use client';

import React, { useState } from 'react';

interface ShareProfileProps {
  profileUrl: string;
  className?: string;
}

export const ShareProfile: React.FC<ShareProfileProps> = ({
  profileUrl,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-4">Share Your Profile</h3>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={profileUrl}
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

      <div className="flex gap-3">
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-4 py-2 bg-blue-400 text-white text-center rounded-lg hover:bg-blue-500"
        >
          🐦 Twitter
        </a>
        <a
          href={`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-4 py-2 bg-blue-700 text-white text-center rounded-lg hover:bg-blue-800"
        >
          💼 LinkedIn
        </a>
      </div>
    </div>
  );
};

export default ShareProfile;
