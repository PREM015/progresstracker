'use client';

import React, { useState } from 'react';

interface ReferralLinkProps {
  code: string;
  className?: string;
}

export const ReferralLink: React.FC<ReferralLinkProps> = ({
  code,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const link = `https://progresstracker.app/ref/${code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white border-2 border-indigo-200 rounded-xl p-6 ${className}`}>
      <h4 className="font-semibold mb-4">Share Your Referral Link</h4>

      <div className="flex gap-3">
        <input
          type="text"
          value={link}
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

      <div className="mt-4 text-sm text-gray-600">
        Earn rewards when friends sign up using your link!
      </div>
    </div>
  );
};

export default ReferralLink;
