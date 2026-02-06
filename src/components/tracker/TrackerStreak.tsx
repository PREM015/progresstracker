'use client';

import { useState, useEffect } from 'react';

interface TrackerStreakProps {
    userId?: string;
    className?: string;
}

interface StreakData {
    currentStreak: number;
    longestStreak: number;
    streakStartDate?: string;
    lastActivityDate?: string;
    streakFreezeCount: number;
}

export function TrackerStreak({ userId, className = '' }: TrackerStreakProps) {
    const [streak, setStreak] = useState<StreakData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStreakData();
    }, [userId]);

    const fetchStreakData = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/user/stats');
            if (!res.ok) throw new Error('Failed to fetch streak data');

            const data = await res.json();
            setStreak({
                currentStreak: data.currentStreak || 0,
                longestStreak: data.longestStreak || 0,
                streakStartDate: data.streakStartDate,
                lastActivityDate: data.lastActivityDate,
                streakFreezeCount: data.streakFreezeCount || 0,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getDaysUntilStreakBreak = () => {
        if (!streak?.lastActivityDate) return null;
        const lastActivity = new Date(streak.lastActivityDate);
        const now = new Date();
        const diffTime = now.getTime() - lastActivity.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, 1 - diffDays);
    };

    const getStreakStatus = () => {
        const daysLeft = getDaysUntilStreakBreak();
        if (daysLeft === null) return 'unknown';
        if (daysLeft === 0) return 'at-risk';
        return 'active';
    };

    if (loading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-48 bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    if (error || !streak) {
        return (
            <div className={`bg-red-50 border border-red-200 rounded-xl p-6 ${className}`}>
                <p className="text-red-600">{error || 'No streak data available'}</p>
            </div>
        );
    }

    const status = getStreakStatus();
    const daysLeft = getDaysUntilStreakBreak();

    return (
        <div className={className}>
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
                {/* Current Streak */}
                <div className="text-center mb-6">
                    <div className="text-6xl mb-2">🔥</div>
                    <div className="text-5xl font-bold mb-2">{streak.currentStreak}</div>
                    <div className="text-xl opacity-90">Day Streak</div>
                </div>

                {/* Status Badge */}
                <div className="flex justify-center mb-6">
                    {status === 'active' && daysLeft !== null && daysLeft > 0 && (
                        <div className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-medium">
                            ✅ Keep it going!
                        </div>
                    )}
                    {status === 'at-risk' && (
                        <div className="px-4 py-2 bg-yellow-500/30 backdrop-blur rounded-full text-sm font-medium animate-pulse">
                            ⚠️ Streak at risk! Log activity today
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">{streak.longestStreak}</div>
                        <div className="text-sm opacity-75">Longest</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">{streak.streakFreezeCount}</div>
                        <div className="text-sm opacity-75">Freezes Left</div>
                    </div>
                </div>

                {/* Streak Info */}
                {streak.streakStartDate && (
                    <div className="text-center text-sm opacity-75">
                        Started {new Date(streak.streakStartDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </div>
                )}
            </div>

            {/* Calendar Preview */}
            <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Recent Activity</h4>
                <div className="flex gap-1 overflow-x-auto pb-2">
                    {Array.from({ length: 14 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (13 - i));
                        const hasActivity = i >= 13 - streak.currentStreak;

                        return (
                            <div
                                key={i}
                                className={`flex-shrink-0 w-8 h-8 rounded ${hasActivity
                                        ? 'bg-orange-500'
                                        : 'bg-gray-100'
                                    }`}
                                title={date.toLocaleDateString()}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>2 weeks ago</span>
                    <span>Today</span>
                </div>
            </div>

            {/* Motivational Message */}
            <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-sm text-gray-700 text-center">
                    {streak.currentStreak === 0 && "Start your streak today! 🚀"}
                    {streak.currentStreak > 0 && streak.currentStreak < 7 && "Great start! Keep it going 💪"}
                    {streak.currentStreak >= 7 && streak.currentStreak < 30 && "Amazing dedication! 🌟"}
                    {streak.currentStreak >= 30 && streak.currentStreak < 100 && "You're on fire! 🔥"}
                    {streak.currentStreak >= 100 && "Legendary streak! 👑"}
                </p>
            </div>
        </div>
    );
}

export default TrackerStreak;
