'use client';

import React from 'react';
import { Trophy, Star, Flame, Target } from 'lucide-react';

interface Milestone {
    days: number;
    reached: boolean;
    reachedAt?: Date;
}

interface StreakMilestoneProps {
    milestones?: Milestone[];
    currentStreak?: number;
    className?: string;
}

const milestoneIcons: Record<number, React.ElementType> = {
    7: Star,
    14: Flame,
    30: Trophy,
    60: Target,
    90: Trophy,
    180: Trophy,
    365: Trophy,
};

const milestoneLabels: Record<number, string> = {
    7: 'One Week',
    14: 'Two Weeks',
    30: 'One Month',
    60: 'Two Months',
    90: 'Quarter Year',
    180: 'Half Year',
    365: 'Full Year',
};

export const StreakMilestone: React.FC<StreakMilestoneProps> = ({
    milestones = [
        { days: 7, reached: false },
        { days: 14, reached: false },
        { days: 30, reached: false },
        { days: 60, reached: false },
        { days: 90, reached: false },
        { days: 180, reached: false },
        { days: 365, reached: false },
    ],
    currentStreak = 0,
    className = '',
}) => {
    return (
        <div className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 ${className}`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Milestones</h3>
            <div className="space-y-3">
                {milestones.map((m) => {
                    const Icon = milestoneIcons[m.days] || Trophy;
                    const label = milestoneLabels[m.days] || `${m.days} Days`;
                    const progress = Math.min((currentStreak / m.days) * 100, 100);
                    const isNext = !m.reached && currentStreak < m.days;

                    return (
                        <div
                            key={m.days}
                            className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${m.reached
                                    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                                    : isNext
                                        ? 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/5'
                                        : 'border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.reached
                                    ? 'bg-green-100 dark:bg-green-900/30'
                                    : 'bg-gray-100 dark:bg-zinc-800'
                                }`}>
                                <Icon className={`h-5 w-5 ${m.reached ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'
                                    }`} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`font-medium ${m.reached ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'
                                        }`}>
                                        {label}
                                    </span>
                                    <span className="text-xs text-gray-400">{m.days}d</span>
                                </div>
                                {!m.reached && (
                                    <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1 mt-1.5">
                                        <div
                                            className="bg-orange-500 h-1 rounded-full transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}
                                {m.reached && m.reachedAt && (
                                    <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                                        Reached {new Date(m.reachedAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>

                            {m.reached && (
                                <span className="text-green-500 text-sm">✓</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StreakMilestone;
