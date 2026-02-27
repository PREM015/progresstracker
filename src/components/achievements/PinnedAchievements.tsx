// src/components/achievements/PinnedAchievements.tsx
'use client';

import { memo, useState, useEffect, useCallback, useTransition } from 'react';
import type { UserAchievement, Achievement } from '@/types/achievement';
import { RARITY_CONFIG } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface PinnedAchievementsProps {
  userId?: string;
  maxItems?: number;
  onAchievementClick?: (achievement: Achievement) => void;
  onUnpin?: (achievementId: string) => Promise<void>;
  emptyMessage?: string;
  showUnpinButton?: boolean;
  layout?: 'row' | 'grid';
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PinnedAchievements = memo(function PinnedAchievements({
  userId,
  maxItems = 5,
  onAchievementClick,
  onUnpin,
  emptyMessage = 'No pinned achievements yet',
  showUnpinButton = true,
  layout = 'row',
  className = '',
}: PinnedAchievementsProps) {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchPinnedAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/achievements/pinned?limit=${maxItems}`);
      if (!response.ok) throw new Error('Failed to fetch pinned achievements');

      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    if (userId) {
      fetchPinnedAchievements();
    }
  }, [userId, fetchPinnedAchievements]);

  const handleUnpin = useCallback(async (achievementId: string) => {
    if (!onUnpin) return;

    // Optimistic update
    setAchievements(prev => prev.filter(a => a.achievementId !== achievementId));

    startTransition(async () => {
      try {
        await onUnpin(achievementId);
      } catch {
        // Revert on error
        fetchPinnedAchievements();
      }
    });
  }, [onUnpin, fetchPinnedAchievements]);

  if (isLoading) {
    return <PinnedSkeleton layout={layout} count={maxItems} className={className} />;
  }

  if (error) {
    return (
      <div className={`text-center py-4 text-red-500 ${className}`}>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchPinnedAchievements}
          className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className={`text-center py-8 bg-gray-50 rounded-xl ${className}`}>
        <span className="text-3xl">📌</span>
        <p className="mt-2 text-sm text-gray-500">{emptyMessage}</p>
        <p className="text-xs text-gray-400 mt-1">
          Pin up to {maxItems} achievements to showcase them
        </p>
      </div>
    );
  }

  const layoutClass = layout === 'row'
    ? 'flex gap-3 overflow-x-auto pb-2 scrollbar-hide'
    : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3';

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          📌 Pinned Achievements
        </h3>
        <span className="text-xs text-gray-400">
          {achievements.length}/{maxItems}
        </span>
      </div>

      <div className={layoutClass}>
        {achievements.map((ua) => (
          <PinnedItem
            key={ua.id}
            userAchievement={ua}
            onClick={onAchievementClick ? () => onAchievementClick(ua.achievement) : undefined}
            onUnpin={showUnpinButton && onUnpin ? () => handleUnpin(ua.achievementId) : undefined}
            isUnpinning={isPending}
            layout={layout}
          />
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// PINNED ITEM
// =============================================================================

interface PinnedItemProps {
  userAchievement: UserAchievement;
  onClick?: () => void;
  onUnpin?: () => void;
  isUnpinning?: boolean;
  layout: 'row' | 'grid';
}

const PinnedItem = memo(function PinnedItem({
  userAchievement,
  onClick,
  onUnpin,
  isUnpinning,
  layout,
}: PinnedItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { achievement } = userAchievement;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];

  return (
    <div
      className={`
        relative group flex-shrink-0
        ${layout === 'row' ? 'w-32' : ''}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div
        className={`
          p-3 rounded-xl border-2 transition-all duration-200
          ${rarityConfig.borderClass} ${rarityConfig.bgClass}
          ${isHovered ? 'shadow-md scale-105' : ''}
        `}
      >
        {/* Unpin Button */}
        {onUnpin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnpin();
            }}
            disabled={isUnpinning}
            className={`
              absolute -top-2 -right-2 p-1 rounded-full bg-white border border-gray-200
              shadow-sm transition-all duration-200 z-10
              ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
              hover:bg-red-50 hover:border-red-200 hover:text-red-500
              disabled:opacity-50
            `}
          >
            <XIcon className="w-3 h-3" />
          </button>
        )}

        {/* Icon */}
        <div className="flex justify-center mb-2">
          <span className="text-3xl">{achievement.icon}</span>
        </div>

        {/* Title */}
        <p className="text-xs font-medium text-center text-gray-700 truncate">
          {achievement.title}
        </p>

        {/* Rarity */}
        <div className="mt-1 text-center">
          <span className={`text-[10px] font-medium ${rarityConfig.textClass}`}>
            {rarityConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// SKELETON
// =============================================================================

function PinnedSkeleton({ layout, count, className }: { layout: 'row' | 'grid'; count: number; className?: string }) {
  const layoutClass = layout === 'row'
    ? 'flex gap-3 overflow-hidden'
    : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3';

  return (
    <div className={className}>
      <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-3" />
      <div className={layoutClass}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`
              ${layout === 'row' ? 'w-32 flex-shrink-0' : ''}
              h-24 bg-gray-100 rounded-xl animate-pulse
            `}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ICONS
// =============================================================================

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default PinnedAchievements;