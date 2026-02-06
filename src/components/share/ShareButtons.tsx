'use client';

import React from 'react';

interface ShareButtonsProps {
  url: string;
  title: string;
  className?: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({
  url,
  title,
  className = '',
}) => {
  const platforms = [
    { name: 'Twitter', icon: '🐦', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
    { name: 'Facebook', icon: '👍', url: `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { name: 'LinkedIn', icon: '💼', url: `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { name: 'Reddit', icon: '🤖', url: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}` },
  ];

  return (
    <div className={`flex gap-3 ${className}`}>
      {platforms.map(platform => (
        <a
          key={platform.name}
          href={platform.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          title={`Share on ${platform.name}`}
        >
          <span className="text-xl">{platform.icon}</span>
          <span className="text-sm font-medium">{platform.name}</span>
        </a>
      ))}
    </div>
  );
};

export default ShareButtons;
