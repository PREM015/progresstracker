'use client';

import React from 'react';

interface Achievement {
  id: string;
  name: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  unlockedAt: string;
}

interface ProfileAchievementsProps {
  achievements: Achievement[];
  className?: string;
}

export const ProfileAchievements: React.FC<ProfileAchievementsProps> = ({
  achievements,
  className = '',
}) => {
  const tierColors = {
    bronze: 'from-amber-600 to-amber-700',
    silver: 'from-gray-400 to-gray-500',
    gold: 'from-yellow-400 to-yellow-500',
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Achievements ({achievements.length})</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {achievements.map(achievement => (
          <div
            key={achievement.id}
            className={`aspect-square bg-gradient-to-br ${tierColors[achievement.tier]} text-white rounded-xl p-4 flex flex-col items-center justify-center text-center`}
          >
            <div className="text-4xl mb-2">{achievement.icon}</div>
            <div className="text-sm font-bold">{achievement.name}</div>
            <div className="text-xs opacity-75 mt-1">
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {achievements.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <span className="text-5xl mb-4 block">🏆</span>
          No achievements yet
        </div>
      )}
    </div>
  );
};

export default ProfileAchievements;
