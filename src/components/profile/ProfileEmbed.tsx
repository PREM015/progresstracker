'use client';

import React from 'react';

interface ProfileEmbedProps {
  username: string;
  theme?: 'light' | 'dark';
  showStats?: boolean;
  className?: string;
}

export const ProfileEmbed: React.FC<ProfileEmbedProps> = ({
  username,
  theme = 'light',
  showStats = true,
  className = '',
}) => {
  const embedUrl = `https://progresstracker.app/embed/profile/${username}?theme=${theme}&stats=${showStats}`;

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-4">Embed Your Profile</h3>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              checked={showStats}
              className="w-5 h-5"
              readOnly
            />
            <span>Show Statistics</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Embed Code</label>
          <textarea
            readOnly
            value={`<iframe src="${embedUrl}" width="100%" height="300" frameborder="0"></iframe>`}
            className="w-full px-4 py-3 border rounded-lg font-mono text-sm bg-gray-50"
            rows={3}
          />
        </div>

        <button className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          📋 Copy Embed Code
        </button>
      </div>
    </div>
  );
};

export default ProfileEmbed;
