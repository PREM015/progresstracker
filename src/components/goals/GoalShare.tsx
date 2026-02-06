'use client';

import React, { useState } from 'react';

interface GoalShareProps {
  goalId: string;
  goalTitle: string;
  progress: number;
  className?: string;
}

export const GoalShare: React.FC<GoalShareProps> = ({
  goalId,
  goalTitle,
  progress,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/goals/${goalId}`;
  const shareText = `I'm ${progress}% towards my goal: ${goalTitle}!`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    {
      name: 'Twitter',
      icon: '🐦',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Facebook',
      icon: '📘',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
  ];

  return (
    <div className={`bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-4">Share Your Progress</h3>
      <p className="opacity-90 mb-6">Show your friends how you're crushing your goals!</p>

      <div className="space-y-3">
        {shareOptions.map((option) => (
          <a
            key={option.name}
            href={option.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors"
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="font-medium">Share on {option.name}</span>
          </a>
        ))}

        <button
          onClick={copyLink}
          className="w-full flex items-center gap-3 p-3 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors"
        >
          <span className="text-2xl">🔗</span>
          <span className="font-medium">{copied ? 'Link Copied!' : 'Copy Link'}</span>
        </button>
      </div>
    </div>
  );
};

export default GoalShare;
