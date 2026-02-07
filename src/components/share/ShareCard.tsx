'use client';

import React from 'react';

interface ShareCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  className?: string;
}

export const ShareCard: React.FC<ShareCardProps> = ({
  title,
  description,
  imageUrl,
  url,
  className = '',
}) => {
  return (
    <div className={`bg-white border-2 border-gray-200 rounded-xl overflow-hidden ${className}`}>
      {imageUrl && (
        <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Share
          </button>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
