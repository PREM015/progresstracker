'use client';

import React from 'react';

interface ProfileHeaderProps {
  user: {
    name: string;
    username: string;
    bio?: string;
    avatar?: string;
    joinedAt: string;
  };
  className?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  className = '',
}) => {
  return (
    <div className={`bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl p-8 ${className}`}>
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl">
          {user.avatar || user.name.charAt(0)}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
          <div className="text-lg opacity-90 mb-3">@{user.username}</div>
          {user.bio && <p className="opacity-90 mb-4">{user.bio}</p>}
          <div className="text-sm opacity-75">
            📅 Joined {new Date(user.joinedAt).toLocaleDateString()}
          </div>
        </div>

        <button className="px-6 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 font-semibold">
          Edit Profile
        </button>
      </div>
    </div>
  );
};

export default ProfileHeader;
