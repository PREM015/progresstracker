'use client';

import React from 'react';

interface PublicProfilePageProps {
  username: string;
  isOwner?: boolean;
  className?: string;
}

export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({
  username,
  isOwner = false,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-5xl mx-auto p-8">
        {/* Public profile view - would compose other profile components */}
        <div className="bg-white border rounded-2xl p-8 text-center">
          <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center text-white text-5xl">
            {username.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold mb-2">@{username}</h1>
          <p className="text-gray-600 mb-6">Public profile view</p>

          {isOwner && (
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;
