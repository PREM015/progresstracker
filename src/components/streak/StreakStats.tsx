'use client';

import React from 'react';
import { TrendingUp, Calendar, Zap, Award } from 'lucide-react';

interface StreakStatsProps {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    averageStreak?: number;
    milestones?: { days: number; reached: boolean; reachedAt?: Date }[];
    className?: string;
}

export const StreakStats: React.FC<StreakStatsProps> = ({
    currentStreak,
    longestStreak,
    totalActiveDays,
    averageStreak = 0,
    milestones = [],
    className = '',
}) => {
    const streakPercentage = longestStreak > 0 ? Math.round((currentStreak / longestStreak) * 100) : 0;

    const stats = [
        {
            label: 'Current Streak',
            value: currentStreak,
            suffix: 'days',
            icon: Zap,
            color: 'text-orange-500',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
        },
        {
            label: 'Longest Streak',
            value: longestStreak,
            suffix: 'days',
            icon: Award,
            color: 'text-purple-500',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            label: 'Active Days',
            value: totalActiveDays,
            suffix: 'total',
            icon: Calendar,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            label: 'Avg Streak',
            value: averageStreak,
            suffix: 'days',
            icon: TrendingUp,
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-900/20',
        },
    ];

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Progress to Record */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Progress to Record</h3>
                    <span className="text-sm text-gray-500">
                        {currentStreak} / {longestStreak} days
                    </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-3">
                    <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(streakPercentage, 100)}%` }}
                    />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {streakPercentage >= 100
                        ? '🎉 You\'re at or beyond your record!'
                        : `${longestStreak - currentStreak} more days to beat your record`}
                </p>
            </div>

            {/* Milestones */}
            {milestones.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Milestones</h3>
                    <div className="flex gap-3 flex-wrap">
                        {milestones.map((m) => (
                            <div
                                key={m.days}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${m.reached
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                                    : 'bg-gray-50 dark:bg-zinc-800 text-gray-400 border-gray-200 dark:border-zinc-700'
                                    }`}
                            >
                                {m.reached ? '✓' : '○'} {m.days} days
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StreakStats;
