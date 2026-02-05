// src/components/achievements/AchievementsList.tsx
'use client';

import { memo, useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import type { Achievement, UserAchievement, AchievementProgress } from '@/types/achievement';
import type { AchievementFilterState } from './AchievementFilters';
import { RARITY_CONFIG } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface AchievementsListProps {
  userId?: string;
  initialFilters?: Partial<AchievementFilterState>;
  layout?: 'grid' | 'list';
  showFilters?: boolean;
  onAchievementClick?: (achievement: Achievement) => void;
  onPinToggle?: (achievementId: string) => Promise<void>;
  className?: string;
}

interface AchievementItem {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress?: AchievementProgress;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AchievementsList = memo(function AchievementsList({
  userId,
  initialFilters,
  layout = 'grid',
  showFilters = true,
  onAchievementClick,
  onPinToggle,
  className = '',
}: AchievementsListProps) {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<AchievementFilterState>({
    category: null,
    rarity: null,
    tier: null,
    status: 'all',
    search: '',
    sortBy: 'default',
    ...initialFilters,
  });

  // Fetch achievements
  const fetchAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [achievementsRes, userAchievementsRes, progressRes] = await Promise.all([
        fetch('/api/achievements'),
        userId ? fetch('/api/achievements/available') : Promise.resolve(null),
        userId ? fetch('/api/achievements/progress') : Promise.resolve(null),
      ]);

      if (!achievementsRes.ok) throw new Error('Failed to fetch achievements');

      const achievementsData = await achievementsRes.json();
      const userAchievementsData = userAchievementsRes ? await userAchievementsRes.json() : { achievements: [] };
      const progressData = progressRes ? await progressRes.json() : { progress: [] };

      const userAchievementsMap = new Map<string, UserAchievement>(
        (userAchievementsData.achievements || []).map((ua: UserAchievement) => [ua.achievementId, ua])
      );
      const progressMap = new Map<string, AchievementProgress>(
        (progressData.progress || []).map((p: AchievementProgress) => [p.achievementId, p])
      );

      const combinedItems: AchievementItem[] = (achievementsData.achievements || []).map((achievement: Achievement) => ({
        achievement,
        userAchievement: userAchievementsMap.get(achievement.id),
        progress: progressMap.get(achievement.id),
      }));

      setItems(combinedItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by status
    if (filters.status === 'unlocked') {
      result = result.filter(item => item.userAchievement);
    } else if (filters.status === 'locked') {
      result = result.filter(item => !item.userAchievement);
    }

    // Filter by category
    if (filters.category) {
      result = result.filter(item => item.achievement.category === filters.category);
    }

    // Filter by rarity
    if (filters.rarity) {
      result = result.filter(item => item.achievement.rarity === filters.rarity);
    }

    // Filter by tier
    if (filters.tier) {
      result = result.filter(item => item.achievement.tier === filters.tier);
    }

    // Filter by search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(item =>
        item.achievement.title.toLowerCase().includes(search) ||
        item.achievement.description.toLowerCase().includes(search)
      );
    }

    // Sort
    switch (filters.sortBy) {
      case 'points':
        result.sort((a, b) => b.achievement.points - a.achievement.points);
        break;
      case 'rarity':
        const rarityOrder = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
        result.sort((a, b) =>
          rarityOrder.indexOf(a.achievement.rarity) - rarityOrder.indexOf(b.achievement.rarity)
        );
        break;
      case 'recent':
        result.sort((a, b) => {
          if (!a.userAchievement?.unlockedAt) return 1;
          if (!b.userAchievement?.unlockedAt) return -1;
          return new Date(b.userAchievement.unlockedAt).getTime() - new Date(a.userAchievement.unlockedAt).getTime();
        });
        break;
      case 'progress':
        result.sort((a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0));
        break;
      default:
        result.sort((a, b) => (a.achievement.sortOrder || 0) - (b.achievement.sortOrder || 0));
    }

    return result;
  }, [items, filters]);

  const handlePinToggle = useCallback(async (achievementId: string) => {
    if (!onPinToggle) return;

    startTransition(async () => {
      try {
        await onPinToggle(achievementId);
        // Optimistically update the local state
        setItems(prev => prev.map(item => {
          if (item.achievement.id === achievementId && item.userAchievement) {
            return {
              ...item,
              userAchievement: {
                ...item.userAchievement,
                isPinned: !item.userAchievement.isPinned,
              },
            };
          }
          return item;
        }));
      } catch (error) {
        console.error('Failed to toggle pin:', error);
      }
    });
  }, [onPinToggle]);

  if (isLoading) {
    return <ListSkeleton layout={layout} className={className} />;
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-6 text-center ${className}`}>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchAchievements}
          className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  const layoutClass = layout === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    : 'space-y-3';

  return (
    <div className={className}>
      {/* Quick Stats */}
      <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
        <span>
          <strong className="text-gray-900">{items.filter(i => i.userAchievement).length}</strong> unlocked
        </span>
        <span>•</span>
        <span>
          <strong className="text-gray-900">{items.filter(i => !i.userAchievement).length}</strong> locked
        </span>
        <span>•</span>
        <span>
          <strong className="text-indigo-600">{items.reduce((sum, i) => sum + (i.userAchievement ? i.achievement.points : 0), 0)}</strong> points
        </span>
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <span className="text-4xl">🔍</span>
          <p className="mt-3 text-gray-500">No achievements found</p>
          {filters.search && (
            <button
              onClick={() => setFilters(f => ({ ...f, search: '' }))}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className={layoutClass}>
          {filteredItems.map(({ achievement, userAchievement, progress }) => (
            <AchievementListItem
              key={achievement.id}
              achievement={achievement}
              userAchievement={userAchievement}
              progress={progress}
              layout={layout}
              onClick={onAchievementClick ? () => onAchievementClick(achievement) : undefined}
              onPinToggle={onPinToggle ? () => handlePinToggle(achievement.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// LIST ITEM COMPONENT
// =============================================================================

interface AchievementListItemProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress?: AchievementProgress;
  layout: 'grid' | 'list';
  onClick?: () => void;
  onPinToggle?: () => void;
}

const AchievementListItem = memo(function AchievementListItem({
  achievement,
  userAchievement,
  progress,
  layout,
  onClick,
  onPinToggle,
}: AchievementListItemProps) {
  const isUnlocked = !!userAchievement;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const progressPercent = progress?.percentage ?? (isUnlocked ? 100 : 0);

  if (layout === 'list') {
    return (
      <div
        className={`
          flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl
          ${isUnlocked ? '' : 'opacity-75'}
          ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        `}
        onClick={onClick}
      >
        <div className={`w-12 h-12 flex items-center justify-center rounded-xl text-2xl ${isUnlocked ? rarityConfig.bgClass : 'bg-gray-100 grayscale'}`}>
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 truncate">{achievement.title}</h4>
            {userAchievement?.isPinned && <span className="text-yellow-500">📌</span>}
          </div>
          <p className="text-sm text-gray-500 truncate">{achievement.description}</p>
        </div>
        {!isUnlocked && (
          <div className="w-24">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 text-right mt-1">{progressPercent}%</div>
          </div>
        )}
        <div className="text-right">
          <div className={`font-bold ${isUnlocked ? 'text-indigo-600' : 'text-gray-400'}`}>
            +{achievement.points}
          </div>
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div
      className={`
        relative p-4 bg-white border border-gray-200 rounded-xl overflow-hidden
        ${isUnlocked ? '' : 'opacity-80'}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5' : ''}
      `}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: rarityConfig.color }} />

      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 flex items-center justify-center rounded-xl text-2xl ${isUnlocked ? rarityConfig.bgClass : 'bg-gray-100 grayscale'}`}>
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h4 className="font-medium text-gray-900 truncate text-sm">{achievement.title}</h4>
            {userAchievement?.isPinned && <span className="text-yellow-500 text-xs">📌</span>}
          </div>
          <span className={`text-xs font-medium ${rarityConfig.textClass}`}>{rarityConfig.label}</span>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${isUnlocked ? 'text-indigo-600' : 'text-gray-400'}`}>
            +{achievement.points}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500 line-clamp-2">{achievement.description}</p>

      {!isUnlocked && (
        <div className="mt-3">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {isUnlocked && (
        <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
          <CheckIcon className="w-3 h-3" />
          Unlocked
        </div>
      )}
    </div>
  );
});

// =============================================================================
// SKELETON
// =============================================================================

function ListSkeleton({ layout, className }: { layout: 'grid' | 'list'; className?: string }) {
  const count = layout === 'grid' ? 8 : 5;
  const layoutClass = layout === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    : 'space-y-3';
  const itemClass = layout === 'grid' ? 'h-40 rounded-xl' : 'h-20 rounded-xl';

  return (
    <div className={`${layoutClass} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${itemClass} bg-gray-100 animate-pulse`} />
      ))}
    </div>
  );
}

// =============================================================================
// ICONS
// =============================================================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default AchievementsList;