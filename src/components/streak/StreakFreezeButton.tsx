'use client';

import React from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface StreakFreezeButtonProps {
    freezeCount: number;
    canUseFreeze: boolean;
    isUsingFreeze?: boolean;
    onUseFreeze: () => void;
    className?: string;
}

export const StreakFreezeButton: React.FC<StreakFreezeButtonProps> = ({
    freezeCount,
    canUseFreeze,
    isUsingFreeze = false,
    onUseFreeze,
    className = '',
}) => {
    return (
        <div className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Streak Freeze</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Protect your streak for a day
                    </p>
                </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                You have <span className="font-bold text-blue-600 dark:text-blue-400">{freezeCount}</span> freeze{freezeCount !== 1 ? 's' : ''} available.
                Using a freeze will prevent your streak from breaking for one day of inactivity.
            </p>

            <button
                onClick={onUseFreeze}
                disabled={!canUseFreeze || isUsingFreeze}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${canUseFreeze && !isUsingFreeze
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'
                    }`}
            >
                {isUsingFreeze ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Using Freeze...
                    </>
                ) : (
                    <>
                        <Shield className="h-4 w-4" />
                        {canUseFreeze ? 'Use Streak Freeze' : 'No Freezes Available'}
                    </>
                )}
            </button>
        </div>
    );
};

export default StreakFreezeButton;
