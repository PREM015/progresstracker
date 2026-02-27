'use client';

import React from 'react';

interface ProfilePageProps {
  className?: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-6xl mx-auto p-8">
        {/* Profile page would compose ProfileHeader, ProfileStats, ProfileGoals, etc. */}
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Your Profile</h1>
            <p className="text-gray-600">This page would compose all profile components</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
