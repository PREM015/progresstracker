'use client';

import React from 'react';

interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    unlockedAt?: string;
}

interface ProfileBadgesProps {
    badges: Badge[];
    className?: string;
}

export const ProfileBadges: React.FC<ProfileBadgesProps> = ({
    badges,
    className = '',
}) => {
    const tierColors = {
        bronze: 'from-amber-600 to-amber-700',
        silver: 'from-gray-400 to-gray-500',
        gold: 'from-yellow-400 to-yellow-500',
        platinum: 'from-purple-400 to-pink-500',
    };

    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Badges</h3>

            <div className="grid grid-cols-4 gap-4">
                {badges.map((badge) => (
                    <div
                        key={badge.id}
                        className={`aspect-square bg-gradient-to-br ${tierColors[badge.tier]} rounded-xl p-4 flex flex-col items-center justify-center text-white text-center`}
                        title={badge.description}
                    >
                        <div className="text-4xl mb-2">{badge.icon}</div>
                        <div className="text-sm font-bold">{badge.name}</div>
                        {badge.unlockedAt && (
                            <div className="text-xs opacity-75 mt-1">
                                {new Date(badge.unlockedAt).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {badges.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <span className="text-5xl mb-4 block">🎖️</span>
                    No badges earned yet
                </div>
            )}
        </div>
    );
};

export default ProfileBadges;
