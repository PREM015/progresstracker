'use client';

import { memo, useState, useCallback, useTransition } from 'react';
import { motion } from 'framer-motion';
import type { Achievement, UserAchievement, AchievementProgress } from '@/types/achievement';
import type { AchievementFilterState } from './AchievementFilters';
import { Card } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/GlassCard';
import { CheckCircle2, Lock, Pin, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAchievements } from '@/hooks/useAchievements';

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
  const [filters, setFilters] = useState<AchievementFilterState>({
    category: null,
    rarity: null,
    tier: null,
    status: 'all',
    search: '',
    sortBy: 'default',
    ...initialFilters,
  });

  // Use hook for data fetching and filtering
  const {
    achievements: filteredItems, // Hook handles filtering based on params
    isLoading,
    error,
    pinAchievement
  } = useAchievements({
    category: filters.category || undefined,
    rarity: filters.rarity || undefined,
    search: filters.search,
    isUnlocked: filters.status === 'unlocked' ? true : filters.status === 'locked' ? false : undefined
  });

  const [isPending, startTransition] = useTransition();

  const handlePinToggle = useCallback(async (achievementId: string) => {
    if (!onPinToggle && !pinAchievement) return;

    startTransition(async () => {
      try {
        if (onPinToggle) {
          await onPinToggle(achievementId);
        } else {
          // Fallback to hook's pin function if prop not provided
          await pinAchievement(achievementId);
        }
      } catch (error) {
        console.error('Failed to toggle pin:', error);
      }
    });
  }, [onPinToggle, pinAchievement]);

  if (isLoading) return <ListSkeleton layout={layout} className={className} />;

  // Transform error object to string if needed, or generic message
  if (error) return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load achievements. Please try again later.</div>;

  return (
    <div className={className}>
      {/* Quick Stats Header - Calculate from items */}
      <div className="flex items-center gap-6 mb-8 px-1">
        <StatBadge label="Unlocked" value={filteredItems.filter(i => i.isUnlocked).length} color="indigo" />
        <StatBadge label="Locked" value={filteredItems.filter(i => !i.isUnlocked).length} color="zinc" />
        <StatBadge label="Total Points" value={filteredItems.filter(i => i.isUnlocked).reduce((sum, i) => sum + (i.achievement.points || 0), 0)} color="amber" />
      </div>

      <div className={layout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" : "space-y-3"}>
        {filteredItems.map((item) => (
          <AchievementCard
            key={item.achievement.id}
            achievement={item.achievement}
            userAchievement={item.isUnlocked ? {
              // Creating a partial object compatible with what AchievementCard expects
              // The card mainly checks for existence and isPinned
              id: 'local-mock',
              userId: userId || 'current',
              achievementId: item.achievement.id,
              unlockedAt: item.unlockedAt!,
              isPinned: item.isPinned,
              // Add other required fields with defaults to satisfy type if needed, 
              // though 'any' in local component makes it lenient.
              // If we were using strict types, we'd need full UserAchievement
            } : undefined}
            progress={{
              current: item.current,
              target: item.target,
              percentage: item.percentage,
              remaining: item.remaining
            }}
            onClick={onAchievementClick ? () => onAchievementClick(item.achievement) : undefined}
            onPinToggle={() => handlePinToggle(item.achievement.id)}
          />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <GlassCard className="py-20 flex flex-col items-center text-center gap-4">
          <Trophy className="w-12 h-12 text-zinc-200 dark:text-zinc-800" />
          <div>
            <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter uppercase">No Achievements Yet</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-2 max-w-xs mx-auto">Keep pushing your boundaries to unlock special rewards and milestones.</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
});


// =============================================================================
// SUBCOMPONENTS
// =============================================================================

function StatBadge({ label, value, color }: { label: string, value: number, color: 'indigo' | 'zinc' | 'amber' }) {
  const colors = {
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-800",
    zinc: "text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/10 border-zinc-200 dark:border-zinc-800",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800",
  };

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium", colors[color])}>
      <span className="font-bold">{value}</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
}

// Keeping local AchievementCard to avoid props mismatch with the one in components/achievements
// and to ensure interactivity is preserved as requested.
function AchievementCard({ achievement, userAchievement, progress, onClick, onPinToggle }: any) {
  const isUnlocked = !!userAchievement;
  const progressPercent = progress?.percentage ?? (isUnlocked ? 100 : 0);
  const rarity = (achievement.rarity || "common") as string;

  const rarityColor = {
    common: "bg-zinc-500",
    uncommon: "bg-emerald-500",
    rare: "bg-blue-500",
    epic: "bg-purple-500",
    legendary: "bg-amber-500",
    mythic: "bg-rose-500",
  }[rarity] || "bg-zinc-500";

  return (
    <GlassCard
      className={cn(
        "relative overflow-hidden transition-all duration-300 group cursor-pointer border-none",
        isUnlocked ? "opacity-100 hover:scale-[1.03]" : "opacity-60 grayscale-[0.5] hover:grayscale-0 hover:opacity-90"
      )}
      onClick={onClick}
    >
      {/* Rarity Accent */}
      <div className={cn("absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full blur-2xl opacity-20", rarityColor)} />

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:scale-110 duration-500",
            isUnlocked ? "bg-zinc-100/50 dark:bg-white/5 text-zinc-900 dark:text-zinc-50" : "bg-zinc-100/30 dark:bg-white/5 text-zinc-400"
          )}>
            {achievement.icon || "🏆"}
          </div>
          {userAchievement?.isPinned && (
            <div className="p-1.5 bg-indigo-500/10 rounded-full">
              <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500" />
            </div>
          )}
        </div>

        <div className="space-y-2 mb-6">
          <h3 className={cn("font-black text-sm uppercase tracking-tight", isUnlocked ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500")}>
            {achievement.title}
          </h3>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 line-clamp-2 uppercase tracking-wide leading-relaxed">
            {achievement.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors",
            isUnlocked
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
              : "bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-500 border-zinc-200 dark:border-zinc-800"
          )}>
            {achievement.points} XP
          </div>

          {isUnlocked ? (
            <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unlocked</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-black uppercase tracking-widest">
              <Lock className="w-3 h-3" />
              <span>{Math.round(progressPercent)}%</span>
            </div>
          )}
        </div>

        {/* Dynamic Progress Bar */}
        {!isUnlocked && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-indigo-500/30"
            />
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function ListSkeleton({ layout, className }: any) {
  return <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>;
}

export default AchievementsList;