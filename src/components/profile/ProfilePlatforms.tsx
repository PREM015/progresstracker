'use client';

import React from 'react';

interface Platform {
  name: string;
  username: string;
  connected: boolean;
  stats?: {
    problems?: number;
    commits?: number;
  };
}

interface ProfilePlatformsProps {
  platforms: Platform[];
  className?: string;
}

export const ProfilePlatforms: React.FC<ProfilePlatformsProps> = ({
  platforms,
  className = '',
}) => {
  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Connected Platforms</h3>

      <div className="grid md:grid-cols-2 gap-4">
        {platforms.filter(p => p.connected).map(platform => (
          <div key={platform.name} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{platform.name}</div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Connected</span>
            </div>
            <div className="text-sm text-gray-600">@{platform.username}</div>
            {platform.stats && (
              <div className="mt-3 flex gap-4 text-sm">
                {platform.stats.problems && <div>🎯 {platform.stats.problems} problems</div>}
                {platform.stats.commits && <div>💻 {platform.stats.commits} commits</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {platforms.filter(p => p.connected).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No platforms connected
        </div>
      )}
    </div>
  );
};

export default ProfilePlatforms;
