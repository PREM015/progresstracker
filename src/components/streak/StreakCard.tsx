'use client';

import React from 'react';
import { Flame, Shield, Clock, Trophy, AlertTriangle } from 'lucide-react';

interface StreakCardProps {
    current: number;
    longest: number;
    isAtRisk?: boolean;
    hoursUntilBreak?: number | null;
    freezeCount?: number;
    className?: string;
}

export const StreakCard: React.FC<StreakCardProps> = ({
    current,
    longest,
    isAtRisk = false,
    hoursUntilBreak = null,
    freezeCount = 0,
    className = '',
}) => {
    return (
        <div className={`bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-2xl p-6 text-white ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Flame className="h-7 w-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Current Streak</h3>
                        <p className="text-sm text-white/80">Keep the momentum going!</p>
                    </div>
                </div>
                {isAtRisk && (
                    <div className="flex items-center gap-1.5 bg-yellow-400/20 text-yellow-200 px-3 py-1.5 rounded-full text-sm backdrop-blur-sm">
                        <AlertTriangle className="h-4 w-4" />
                        At Risk
                    </div>
                )}
            </div>

            <div className="text-center mb-6">
                <div className="text-7xl font-black tabular-nums">{current}</div>
                <div className="text-lg text-white/80 mt-1">
                    {current === 1 ? 'day' : 'days'}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                    <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-300" />
                    <div className="text-lg font-bold">{longest}</div>
                    <div className="text-xs text-white/70">Longest</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                    <Shield className="h-5 w-5 mx-auto mb-1 text-blue-300" />
                    <div className="text-lg font-bold">{freezeCount}</div>
                    <div className="text-xs text-white/70">Freezes</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-green-300" />
                    <div className="text-lg font-bold">{hoursUntilBreak ?? '–'}</div>
                    <div className="text-xs text-white/70">Hours Left</div>
                </div>
            </div>
        </div>
    );
};

export default StreakCard;
