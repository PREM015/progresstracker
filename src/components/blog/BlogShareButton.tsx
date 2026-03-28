// src/components/blog/BlogShareButton.tsx
'use client';

import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { FaTwitter, FaLinkedin } from 'react-icons/fa';

interface Props {
  url: string;
  title: string;
}

export function BlogShareButton({ url, title }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTwitter = () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(title)}`, '_blank');
  const shareLinkedIn = () => window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(title)}`, '_blank');

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-20 py-1">
          <button onClick={copyLink} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button onClick={shareTwitter} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <FaTwitter className="h-4 w-4 text-sky-500" /> Twitter / X
          </button>
          <button onClick={shareLinkedIn} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <FaLinkedin className="h-4 w-4 text-blue-600" /> LinkedIn
          </button>
        </div>
      )}
    </div>
  );
}

export default BlogShareButton;
