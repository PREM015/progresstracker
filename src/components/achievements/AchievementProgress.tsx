// src/components/achievements/AchievementProgress.tsx
'use client';

import { memo, useMemo } from 'react';
import type { AchievementProgress as ProgressType, Achievement } from '@/types/achievement';
import { RARITY_CONFIG } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface AchievementProgressProps {
  progress: ProgressType;
  variant?: 'default' | 'compact' | 'detailed';
  showIcon?: boolean;
  showLabels?: boolean;
  animated?: boolean;
  onClick?: () => void;
  className?: string;
}

interface AchievementProgressListProps {
  progressList: ProgressType[];
  maxItems?: number;
  title?: string;
  emptyMessage?: string;
  onItemClick?: (progress: ProgressType) => void;
  className?: string;
}

// =============================================================================
// SINGLE PROGRESS COMPONENT
// =============================================================================

export const AchievementProgress = memo(function AchievementProgress({
  progress,
  variant = 'default',
  showIcon = true,
  showLabels = true,
  animated = true,
  onClick,
  className = '',
}: AchievementProgressProps) {
  const { achievement, current, target, percentage, isUnlocked } = progress;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];

  const progressBarColor = useMemo(() => {
    if (isUnlocked) return 'from-green-400 to-green-500';
    if (percentage >= 80) return 'from-indigo-400 to-purple-500';
    if (percentage >= 50) return 'from-blue-400 to-indigo-500';
    if (percentage >= 25) return 'from-yellow-400 to-orange-500';
    return 'from-gray-300 to-gray-400';
  }, [isUnlocked, percentage]);

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-3 ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
        onClick={onClick}
      >
        {showIcon && (
          <span className="text-xl flex-shrink-0">{achievement.icon}</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 truncate">{achievement.title}</span>
            <span className="text-xs text-gray-500 ml-2">{percentage}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${progressBarColor} rounded-full ${animated ? 'transition-all duration-700' : ''}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`p-4 bg-white border border-gray-200 rounded-xl ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
        onClick={onClick}
      >
        <div className="flex items-start gap-4">
          {showIcon && (
            <div className={`w-14 h-14 flex items-center justify-center rounded-xl text-2xl ${rarityConfig.bgClass} border-2 ${rarityConfig.borderClass}`}>
              {achievement.icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{achievement.description}</p>

            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-600">{current.toLocaleString()} / {target.toLocaleString()}</span>
                <span className={`font-medium ${isUnlocked ? 'text-green-600' : 'text-indigo-600'}`}>
                  {percentage}%
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${progressBarColor} rounded-full ${animated ? 'transition-all duration-700' : ''}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {showLabels && !isUnlocked && (
              <div className="mt-2 text-xs text-gray-400">
                {target - current} more to unlock
              </div>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <div className={`text-sm font-semibold ${rarityConfig.textClass}`}>
              +{achievement.points}
            </div>
            <div className="text-xs text-gray-400">pts</div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`${onClick ? 'cursor-pointer hover:opacity-90' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-2">
        {showIcon && (
          <span className="text-2xl">{achievement.icon}</span>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{achievement.title}</h4>
          {showLabels && (
            <p className="text-sm text-gray-500">{current} / {target}</p>
          )}
        </div>
        <div className={`text-lg font-bold ${isUnlocked ? 'text-green-600' : 'text-gray-400'}`}>
          {percentage}%
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${progressBarColor} rounded-full ${animated ? 'transition-all duration-700' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

// =============================================================================
// PROGRESS LIST COMPONENT
// =============================================================================

export const AchievementProgressList = memo(function AchievementProgressList({
  progressList,
  maxItems = 5,
  title = 'Almost There',
  emptyMessage = 'No achievements in progress',
  onItemClick,
  className = '',
}: AchievementProgressListProps) {
  const sortedProgress = useMemo(() => {
    return [...progressList]
      .filter(p => !p.isUnlocked && p.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, maxItems);
  }, [progressList, maxItems]);

  if (sortedProgress.length === 0) {
    return (
      <div className={`p-6 text-center bg-gray-50 rounded-xl ${className}`}>
        <span className="text-4xl">🎯</span>
        <p className="mt-2 text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>🔥</span> {title}
          </h3>
        </div>
      )}
      <div className="divide-y divide-gray-50">
        {sortedProgress.map((progress) => (
          <div key={progress.achievementId} className="p-4">
            <AchievementProgress
              progress={progress}
              variant="compact"
              onClick={onItemClick ? () => onItemClick(progress) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

export default AchievementProgress;