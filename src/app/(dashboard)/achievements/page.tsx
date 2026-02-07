// src/app/(dashboard)/achievements/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import type {
  Achievement,
  UserAchievement,
  AchievementProgress,
  AchievementStats,
  AchievementNotification,
  AchievementCategory,
  AchievementRarity,
  AchievementTier
} from '@/types/achievement';
import { RARITY_CONFIG, TIER_CONFIG, CATEGORY_CONFIG } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface FilterState {
  category: AchievementCategory | null;
  rarity: AchievementRarity | null;
  tier: AchievementTier | null;
  status: 'all' | 'unlocked' | 'locked';
  search: string;
  sortBy: 'default' | 'points' | 'rarity' | 'recent' | 'progress';
}

interface AchievementItem {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress?: AchievementProgress;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function AchievementsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // State
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [pinnedAchievements, setPinnedAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // UI State
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [unlockNotification, setUnlockNotification] = useState<AchievementNotification | null>(null);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    category: null,
    rarity: null,
    tier: null,
    status: 'all',
    search: '',
    sortBy: 'default',
  });

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [achievementsRes, userAchievementsRes, progressRes, statsRes, pinnedRes] = await Promise.all([
        fetch('/api/achievements'),
        fetch('/api/achievements/available'),
        fetch('/api/achievements/progress'),
        fetch('/api/achievements/stats'),
        fetch('/api/achievements/pinned?limit=5'),
      ]);

      if (!achievementsRes.ok) throw new Error('Failed to fetch achievements');

      const [achievementsData, userAchievementsData, progressData, statsData, pinnedData] = await Promise.all([
        achievementsRes.json(),
        userAchievementsRes.json(),
        progressRes.json(),
        statsRes.json(),
        pinnedRes.json(),
      ]);

      // Create maps for quick lookup
      const userAchievementsMap = new Map<string, UserAchievement>(
        (userAchievementsData.achievements || []).map((ua: UserAchievement) => [ua.achievementId, ua])
      );
      const progressMap = new Map<string, AchievementProgress>(
        (progressData.progress || []).map((p: AchievementProgress) => [p.achievementId, p])
      );

      // Combine data
      const combinedItems: AchievementItem[] = (achievementsData.achievements || []).map((achievement: Achievement) => ({
        achievement,
        userAchievement: userAchievementsMap.get(achievement.id),
        progress: progressMap.get(achievement.id),
      }));

      setItems(combinedItems);
      setStats(statsData.stats || null);
      setPinnedAchievements(pinnedData.achievements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =============================================================================
  // FILTERED & SORTED ITEMS
  // =============================================================================

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
    const rarityOrder: AchievementRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

    switch (filters.sortBy) {
      case 'points':
        result.sort((a, b) => b.achievement.points - a.achievement.points);
        break;
      case 'rarity':
        result.sort((a, b) => rarityOrder.indexOf(a.achievement.rarity) - rarityOrder.indexOf(b.achievement.rarity));
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

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handlePinToggle = useCallback(async (achievementId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/achievements/${achievementId}/pin`, {
          method: 'POST',
        });

        if (!response.ok) throw new Error('Failed to toggle pin');

        const data = await response.json();

        // Update local state
        setItems(prev => prev.map(item => {
          if (item.achievement.id === achievementId && item.userAchievement) {
            return {
              ...item,
              userAchievement: { ...item.userAchievement, isPinned: data.isPinned },
            };
          }
          return item;
        }));

        // Refresh pinned achievements
        const pinnedRes = await fetch('/api/achievements/pinned?limit=5');
        const pinnedData = await pinnedRes.json();
        setPinnedAchievements(pinnedData.achievements || []);
      } catch (error) {
        console.error('Failed to toggle pin:', error);
      }
    });
  }, []);

  const handleShare = useCallback(async (achievement: Achievement) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `I unlocked "${achievement.title}"!`,
          text: achievement.description,
          url: `${window.location.origin}/achievements/${achievement.id}`,
        });
      } else {
        await navigator.clipboard.writeText(
          `I unlocked "${achievement.title}"! ${window.location.origin}/achievements/${achievement.id}`
        );
        // Could show a toast here
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      category: null,
      rarity: null,
      tier: null,
      status: 'all',
      search: '',
      sortBy: 'default',
    });
  }, []);

  const hasActiveFilters = filters.category || filters.rarity || filters.tier ||
    filters.status !== 'all' || filters.search || filters.sortBy !== 'default';

  // =============================================================================
  // RENDER
  // =============================================================================

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😵</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
              <p className="text-sm text-gray-500 mt-1">
                Track your progress and unlock rewards
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Layout Toggle */}
              <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setLayout('grid')}
                  className={`p-2 rounded-md transition-colors ${layout === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  <GridIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setLayout('list')}
                  className={`p-2 rounded-md transition-colors ${layout === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  <ListIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon="🏆"
              label="Unlocked"
              value={stats.unlocked}
              subtext={`of ${stats.total}`}
              color="indigo"
            />
            <StatCard
              icon="⭐"
              label="Points"
              value={stats.points}
              subtext={`of ${stats.totalPoints}`}
              color="yellow"
            />
            <StatCard
              icon="📊"
              label="Completion"
              value={`${stats.completionPercentage}%`}
              color="green"
            />
            <StatCard
              icon="🔥"
              label="XP Earned"
              value={stats.xpEarned}
              color="purple"
            />
          </div>
        )}

        {/* Pinned Achievements */}
        {pinnedAchievements.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                📌 Pinned
              </h2>
              <span className="text-sm text-gray-400">{pinnedAchievements.length}/5</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {pinnedAchievements.map((ua) => (
                <PinnedBadge
                  key={ua.id}
                  userAchievement={ua}
                  onClick={() => setSelectedAchievement(ua.achievement)}
                  onUnpin={() => handlePinToggle(ua.achievementId)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Almost There - Progress */}
        {items.filter(i => !i.userAchievement && (i.progress?.percentage || 0) > 0).length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🔥 Almost There
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items
                .filter(i => !i.userAchievement && (i.progress?.percentage || 0) > 0)
                .sort((a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0))
                .slice(0, 3)
                .map(({ achievement, progress }) => (
                  <ProgressCard
                    key={achievement.id}
                    achievement={achievement}
                    progress={progress!}
                    onClick={() => setSelectedAchievement(achievement)}
                  />
                ))}
            </div>
          </section>
        )}

        {/* Filters & Search */}
        <section className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search achievements..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${showFilters || hasActiveFilters
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
            >
              <FilterIcon className="w-5 h-5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-500 text-white rounded-full">
                  {[filters.category, filters.rarity, filters.tier, filters.status !== 'all', filters.sortBy !== 'default'].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Sort */}
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value as FilterState['sortBy'] }))}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="points">By Points</option>
              <option value="rarity">By Rarity</option>
              <option value="recent">Recently Unlocked</option>
              <option value="progress">By Progress</option>
            </select>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'unlocked', 'locked'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilters(f => ({ ...f, status }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filters.status === status
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      {status === 'all' ? '🏆 All' : status === 'unlocked' ? '✅ Unlocked' : '🔒 Locked'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rarity */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Rarity</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(RARITY_CONFIG) as [AchievementRarity, typeof RARITY_CONFIG[AchievementRarity]][]).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setFilters(f => ({ ...f, rarity: f.rarity === key ? null : key }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filters.rarity === key
                        ? `${config.bgClass} ${config.textClass}`
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      {config.emoji} {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(CATEGORY_CONFIG) as [AchievementCategory, typeof CATEGORY_CONFIG[AchievementCategory]][]).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setFilters(f => ({ ...f, category: f.category === key ? null : key }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filters.category === key
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      {config.emoji} {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="mt-3 text-sm text-gray-500">
            Showing {filteredItems.length} of {items.length} achievements
          </div>
        </section>

        {/* Achievement Grid/List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <span className="text-5xl">🔍</span>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No achievements found</h3>
            <p className="mt-2 text-gray-500">Try adjusting your filters</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className={
            layout === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
          }>
            {filteredItems.map(({ achievement, userAchievement, progress }) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                userAchievement={userAchievement}
                progress={progress}
                layout={layout}
                onClick={() => setSelectedAchievement(achievement)}
                onPin={() => handlePinToggle(achievement.id)}
                isPinned={userAchievement?.isPinned}
              />
            ))}
          </div>
        )}
      </main>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          userAchievement={items.find(i => i.achievement.id === selectedAchievement.id)?.userAchievement}
          progress={items.find(i => i.achievement.id === selectedAchievement.id)?.progress}
          onClose={() => setSelectedAchievement(null)}
          onPin={() => handlePinToggle(selectedAchievement.id)}
          onShare={() => handleShare(selectedAchievement)}
        />
      )}

      {/* Unlock Notification */}
      {unlockNotification && (
        <UnlockNotification
          notification={unlockNotification}
          onDismiss={() => setUnlockNotification(null)}
          onView={() => {
            setSelectedAchievement(unlockNotification.achievement);
            setUnlockNotification(null);
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({ icon, label, value, subtext, color }: {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  color: 'indigo' | 'yellow' | 'green' | 'purple';
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center text-xl mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">
        {label}
        {subtext && <span className="text-gray-400"> {subtext}</span>}
      </div>
    </div>
  );
}

function PinnedBadge({ userAchievement, onClick, onUnpin }: {
  userAchievement: UserAchievement;
  onClick: () => void;
  onUnpin: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { achievement } = userAchievement;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];

  return (
    <div
      className="relative flex-shrink-0 group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className={`w-20 p-3 rounded-xl border-2 ${rarityConfig.borderClass} ${rarityConfig.bgClass} transition-transform ${isHovered ? 'scale-105' : ''}`}>
        <div className="text-center">
          <span className="text-2xl">{achievement.icon}</span>
          <p className="text-[10px] font-medium text-gray-700 mt-1 truncate">{achievement.title}</p>
        </div>
      </div>
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
          }}
          className="absolute -top-1 -right-1 p-1 bg-white rounded-full border border-gray-200 shadow-sm hover:bg-red-50 hover:border-red-200"
        >
          <XIcon className="w-3 h-3 text-gray-400 hover:text-red-500" />
        </button>
      )}
    </div>
  );
}

function ProgressCard({ achievement, progress, onClick }: {
  achievement: Achievement;
  progress: AchievementProgress;
  onClick: () => void;
}) {
  const rarityConfig = RARITY_CONFIG[achievement.rarity];

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-xl ${rarityConfig.bgClass} flex items-center justify-center text-2xl`}>
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{achievement.title}</h4>
          <p className="text-sm text-gray-500">{progress.current} / {progress.target}</p>
        </div>
        <div className="text-lg font-bold text-indigo-600">{progress.percentage}%</div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}

function AchievementCard({ achievement, userAchievement, progress, layout, onClick, onPin, isPinned }: {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress?: AchievementProgress;
  layout: 'grid' | 'list';
  onClick: () => void;
  onPin: () => void;
  isPinned?: boolean;
}) {
  const isUnlocked = !!userAchievement;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const progressPercent = progress?.percentage ?? (isUnlocked ? 100 : 0);

  if (layout === 'list') {
    return (
      <div
        className={`flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:shadow-md transition-all ${!isUnlocked ? 'opacity-80' : ''}`}
        onClick={onClick}
      >
        <div className={`w-14 h-14 rounded-xl ${isUnlocked ? rarityConfig.bgClass : 'bg-gray-100 grayscale'} flex items-center justify-center text-2xl`}>
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{achievement.title}</h4>
            {isPinned && <span className="text-yellow-500">📌</span>}
          </div>
          <p className="text-sm text-gray-500 truncate">{achievement.description}</p>
        </div>
        {!isUnlocked && (
          <div className="w-20">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-xs text-gray-400 text-right mt-1">{progressPercent}%</p>
          </div>
        )}
        <div className={`font-bold ${isUnlocked ? 'text-indigo-600' : 'text-gray-400'}`}>
          +{achievement.points}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${!isUnlocked ? 'opacity-85' : ''}`}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: rarityConfig.color }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl ${isUnlocked ? rarityConfig.bgClass : 'bg-gray-100 grayscale'} flex items-center justify-center text-2xl`}>
            {achievement.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="font-medium text-gray-900 text-sm truncate">{achievement.title}</h4>
              {isPinned && <span className="text-yellow-500 text-xs">📌</span>}
            </div>
            <span className={`text-xs font-medium ${rarityConfig.textClass}`}>{rarityConfig.label}</span>
          </div>
          <div className={`text-sm font-bold ${isUnlocked ? 'text-indigo-600' : 'text-gray-400'}`}>
            +{achievement.points}
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{achievement.description}</p>
        {!isUnlocked && (
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
        {isUnlocked && (
          <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
            <CheckIcon className="w-3 h-3" />
            Unlocked
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementModal({ achievement, userAchievement, progress, onClose, onPin, onShare }: {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress?: AchievementProgress;
  onClose: () => void;
  onPin: () => void;
  onShare: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const isUnlocked = !!userAchievement;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const tierConfig = TIER_CONFIG[achievement.tier];
  const progressPercent = progress?.percentage ?? (isUnlocked ? 100 : 0);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className={`relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${rarityConfig.color}20, ${rarityConfig.color}40)` }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white text-gray-600">
            <XIcon className="w-5 h-5" />
          </button>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div className={`w-24 h-24 flex items-center justify-center rounded-2xl border-4 border-white shadow-lg text-4xl ${isUnlocked ? rarityConfig.bgClass : 'bg-gray-100 grayscale'}`}>
              {achievement.icon}
            </div>
          </div>
        </div>
        <div className="pt-14 pb-6 px-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{achievement.title}</h2>
            <p className="mt-2 text-gray-600">{achievement.description}</p>
          </div>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${rarityConfig.bgClass} ${rarityConfig.textClass}`}>
              {rarityConfig.emoji} {rarityConfig.label}
            </span>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
              {tierConfig.icon} {tierConfig.label}
            </span>
          </div>
          {!isUnlocked && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="mt-2 text-center text-sm text-gray-500">
                {(progress?.target || achievement.requirement.value) - (progress?.current || 0)} more to unlock
              </p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-indigo-600">+{achievement.points}</div>
              <div className="text-xs text-gray-500 mt-1">Points</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">+{achievement.xpReward}</div>
              <div className="text-xs text-gray-500 mt-1">XP</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-700">{achievement.requirement.value}</div>
              <div className="text-xs text-gray-500 mt-1">Target</div>
            </div>
          </div>
          {isUnlocked && userAchievement?.unlockedAt && (
            <div className="mb-6 p-4 bg-green-50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                <CheckIcon className="w-5 h-5" />
                Unlocked
              </div>
              <p className="mt-1 text-sm text-green-700">
                {new Date(userAchievement.unlockedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            {isUnlocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onPin(); }}
                className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 ${userAchievement?.isPinned ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <PinIcon className="w-5 h-5" filled={userAchievement?.isPinned} />
                {userAchievement?.isPinned ? 'Pinned' : 'Pin'}
              </button>
            )}
            {isUnlocked && (
              <button
                onClick={onShare}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <ShareIcon className="w-5 h-5" />
                Share
              </button>
            )}
            {!isUnlocked && (
              <div className="flex-1 py-3 px-4 rounded-xl text-center text-gray-500 bg-gray-100">
                Keep going to unlock!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UnlockNotification({ notification, onDismiss, onView }: {
  notification: AchievementNotification;
  onDismiss: () => void;
  onView: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const rarityConfig = RARITY_CONFIG[notification.achievement.rarity];

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    const hideTimer = setTimeout(onDismiss, 8000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden w-80 transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
        <div className="h-1" style={{ backgroundColor: rarityConfig.color }} />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl ${rarityConfig.bgClass} flex items-center justify-center text-2xl`}>
              {notification.achievement.icon}
            </div>
            <div className="flex-1">
              <p className="text-xs text-yellow-600 font-medium">🎉 Achievement Unlocked!</p>
              <h4 className="font-semibold text-gray-900">{notification.achievement.title}</h4>
              <p className="text-sm text-gray-500">+{notification.pointsEarned} pts</p>
            </div>
            <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onView}
            className="mt-3 w-full py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}

// =============================================================================
// ICONS
// =============================================================================

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

function PinIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}