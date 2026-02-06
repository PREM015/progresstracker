'use client';

import React from 'react';

interface Feature {
    icon: string;
    title: string;
    description: string;
}

interface FeaturesGridProps {
    features?: Feature[];
    className?: string;
}

const DEFAULT_FEATURES: Feature[] = [
    {
        icon: '🎯',
        title: 'Track Your Progress',
        description: 'Monitor your coding journey across multiple platforms in one unified dashboard',
    },
    {
        icon: '📊',
        title: 'Detailed Analytics',
        description: 'Get insights into your performance with comprehensive charts and statistics',
    },
    {
        icon: '🏆',
        title: 'Earn Achievements',
        description: 'Unlock badges and achievements as you hit milestones and complete challenges',
    },
    {
        icon: '🎖️',
        title: 'Compete on Leaderboards',
        description: 'See how you rank against other developers and climb the global leaderboard',
    },
    {
        icon: '🔄',
        title: 'Auto-Sync Platforms',
        description: 'Automatically sync data from LeetCode, GitHub, HackerRank, and more',
    },
    {
        icon: '📈',
        title: 'Set Goals',
        description: 'Create custom goals and track your progress towards achieving them',
    },
];

export const FeaturesGrid: React.FC<FeaturesGridProps> = ({
    features = DEFAULT_FEATURES,
    className = '',
}) => {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${className}`}>
            {features.map((feature, idx) => (
                <div
                    key={idx}
                    className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl transition-all hover:scale-105"
                >
                    <div className="text-5xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
            ))}
        </div>
    );
};

export default FeaturesGrid;
