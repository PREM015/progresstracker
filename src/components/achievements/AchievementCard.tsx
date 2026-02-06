'use client';

import React, { useState, useEffect } from 'react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  className?: string;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  className = '',
}) => {
  const tierColors = {
    bronze: 'from-orange-600 to-orange-800',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-purple-500 to-purple-700',
  };

  const progress = (achievement.progress / achievement.target) * 100;

  return (
    <div className={`relative bg-white border-2 ${achievement.unlocked ? 'border-green-200 shadow-lg' : 'border-gray-200'
      } rounded-xl p-6 overflow-hidden ${className}`}>
      {/* Tier Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${tierColors[achievement.tier]}`}>
        {achievement.tier.toUpperCase()}
      </div>

      {/* Icon */}
      <div className={`text-6xl mb-4 ${!achievement.unlocked && 'opacity-30 grayscale'}`}>
        {achievement.icon}
      </div>

      {/* Title & Description */}
      <h3 className={`text-lg font-bold mb-2 ${achievement.unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
        {achievement.title}
      </h3>
      <p className="text-sm text-gray-600 mb-4">{achievement.description}</p>

      {/* Progress Bar */}
      {!achievement.unlocked && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{achievement.progress} / {achievement.target}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Unlocked Badge */}
      {achievement.unlocked && achievement.unlockedAt && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-700 text-sm font-medium">
            ✓ Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default AchievementCard;