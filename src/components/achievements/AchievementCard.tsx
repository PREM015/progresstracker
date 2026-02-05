// src/components/achievements/AchievementCard.tsx
'use client';

import { memo, useState, useCallback, useTransition } from 'react';
import type { Achievement, UserAchievement, AchievementProgress as ProgressType } from '@/types/achievement';
import { RARITY_CONFIG, TIER_CONFIG } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface AchievementCardProps {
  achievement: Achievement;
  userAchievement?: UserAchievement | null;
  progress?: ProgressType | null;
  showProgress?: boolean;
  showActions?: boolean;
  isPinned?: boolean;
  onPin?: (id: string) => Promise<void>;
  onView?: (achievement: Achievement) => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AchievementCard = memo(function AchievementCard({
  achievement,
  userAchievement,
  progress,
  showProgress = true,
  showActions = true,
  isPinned: initialPinned = false,
  onPin,
  onView,
  className = '',
}: AchievementCardProps) {
  const [isPinned, setIsPinned] = useState(initialPinned || userAchievement?.isPinned || false);
  const [isPending, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);

  const isUnlocked = !!userAchievement;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const tierConfig = TIER_CONFIG[achievement.tier];

  const progressPercent = progress?.percentage ?? (isUnlocked ? 100 : 0);
  const currentValue = progress?.current ?? (isUnlocked ? achievement.requirement.value : 0);
  const targetValue = progress?.target ?? achievement.requirement.value;

  const handlePin = useCallback(async () => {
    if (!onPin || !isUnlocked) return;

    const newPinned = !isPinned;
    setIsPinned(newPinned); // Optimistic update

    startTransition(async () => {
      try {
        await onPin(achievement.id);
      } catch {
        setIsPinned(!newPinned); // Revert on error
      }
    });
  }, [onPin, isUnlocked, isPinned, achievement.id]);

  const handleView = useCallback(() => {
    onView?.(achievement);
  }, [onView, achievement]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl border bg-white
        transition-all duration-300 ease-out
        ${isUnlocked ? 'border-gray-200 shadow-sm hover:shadow-md' : 'border-gray-100 bg-gray-50'}
        ${isHovered ? 'scale-[1.02]' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Rarity Indicator */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: rarityConfig.color }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`
              relative flex-shrink-0 w-14 h-14 flex items-center justify-center
              rounded-xl border-2 text-2xl
              transition-transform duration-300
              ${isUnlocked ? rarityConfig.bgClass : 'bg-gray-100'}
              ${isUnlocked ? rarityConfig.borderClass : 'border-gray-200'}
              ${isUnlocked ? '' : 'grayscale opacity-60'}
              ${isHovered && isUnlocked ? 'scale-110 rotate-3' : ''}
            `}
          >
            {achievement.icon}
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                <LockIcon className="w-5 h-5 text-gray-500" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold truncate ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                {achievement.title}
              </h3>
              {isPinned && isUnlocked && (
                <span className="text-yellow-500 text-sm">📌</span>
              )}
            </div>
            <p className={`text-sm mt-0.5 line-clamp-2 ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
              {achievement.description}
            </p>
          </div>

          {/* Points */}
          <div className="flex-shrink-0 text-right">
            <div className={`text-lg font-bold ${isUnlocked ? 'text-indigo-600' : 'text-gray-400'}`}>
              +{achievement.points}
            </div>
            <div className="text-xs text-gray-400">pts</div>
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && !isUnlocked && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{currentValue} / {targetValue}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          {/* Meta Info */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${rarityConfig.bgClass} ${rarityConfig.textClass}`}
            >
              {rarityConfig.label}
            </span>
            <span className="text-xs text-gray-400">
              {tierConfig.icon} {tierConfig.label}
            </span>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-1">
              {isUnlocked && onPin && (
                <button
                  onClick={handlePin}
                  disabled={isPending}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${isPinned ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}
                    disabled:opacity-50
                  `}
                  title={isPinned ? 'Unpin' : 'Pin'}
                >
                  <PinIcon className="w-4 h-4" filled={isPinned} />
                </button>
              )}
              {onView && (
                <button
                  onClick={handleView}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="View Details"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Unlock Date */}
        {isUnlocked && userAchievement?.unlockedAt && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-1">
            <CheckIcon className="w-3 h-3 text-green-500" />
            Unlocked {formatDate(userAchievement.unlockedAt)}
          </div>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// ICONS
// =============================================================================

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function PinIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default AchievementCard;