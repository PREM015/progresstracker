'use client';

import React, { useState } from 'react';

interface ShareButtonProps {
    title: string;
    text: string;
    url: string;
    className?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
    title,
    text,
    url,
    className = '',
}) => {
    const [copied, setCopied] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            setShowMenu(true);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
            setShowMenu(false);
        }, 2000);
    };

    const shareOptions = [
        {
            name: 'Twitter',
            icon: '🐦',
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        },
        {
            name: 'LinkedIn',
            icon: '💼',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        },
        {
            name: 'Facebook',
            icon: '📘',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        },
    ];

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={handleNativeShare}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
            >
                <span>📤</span>
                Share
            </button>

            {showMenu && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-64 z-10">
                    <h4 className="font-semibold text-gray-900 mb-3">Share via</h4>
                    <div className="space-y-2">
                        {shareOptions.map((option) => (
                            <a
                                key={option.name}
                                href={option.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                <span className="text-2xl">{option.icon}</span>
                                <span className="text-sm font-medium text-gray-700">{option.name}</span>
                            </a>
                        ))}
                        <button
                            onClick={handleCopyLink}
                            className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            <span className="text-2xl">🔗</span>
                            <span className="text-sm font-medium text-gray-700">
                                {copied ? 'Link Copied!' : 'Copy Link'}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShareButton;
