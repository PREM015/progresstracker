/**
 * Component: AchievementCard
 * Location: components/achievements/AchievementCard.tsx
 * 
 * Description: Premium Glassmorphism Achievement Card with staggered animations
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Pin, Share2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AchievementBadge } from './AchievementBadge';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import {
  Achievement,
  UserAchievement,
  AchievementProgress,
  RARITY_CONFIG,
  CATEGORY_CONFIG
} from '@/types/achievement';
import { TimeAgo } from '@/components/widgets/TimeAgo';

export interface AchievementCardProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  progress?: AchievementProgress;
  index?: number;
  onClick?: () => void;
  onPin?: (id: string) => void;
  onShare?: (id: string) => void;
  className?: string;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  userAchievement,
  progress,
  index = 0,
  onClick,
  onPin,
  onShare,
  className,
}) => {
  const isUnlocked = !!userAchievement;
  const isPinned = userAchievement?.isPinned ?? false;
  const percentage = progress?.percentage || (isUnlocked ? 100 : 0);

  const rarityConfig = RARITY_CONFIG[achievement.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common;
  const categoryConfig = CATEGORY_CONFIG[achievement.category as keyof typeof CATEGORY_CONFIG];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col p-5 rounded-2xl border transition-all duration-300',
        'bg-[var(--card-bg)] border-[var(--card-border)] backdrop-blur-sm',
        isUnlocked
          ? 'hover:border-[var(--primary)]/50 hover:shadow-2xl hover:shadow-[var(--primary)]/10'
          : 'grayscale-[0.5] opacity-80 hover:opacity-100',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Background Glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{ backgroundColor: rarityConfig.color }}
      />

      <div className="flex items-start justify-between gap-4 mb-4">
        <AchievementBadge
          achievement={achievement}
          isUnlocked={isUnlocked}
          size="md"
          animate={false}
        />

        <div className="flex flex-col items-end gap-2">
          <Badge
            variant="default"
            className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border-none"
            style={{ backgroundColor: `${rarityConfig.color}20`, color: rarityConfig.color }}
          >
            {rarityConfig.label}
          </Badge>

          <div className="flex gap-1">
            {onPin && isUnlocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onPin(achievement.id); }}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  isPinned ? "bg-[var(--primary)] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--foreground)]"
                )}
              >
                <Pin className="w-3.5 h-3.5" fill={isPinned ? "currentColor" : "none"} />
              </button>
            )}
            {onShare && (
              <button
                onClick={(e) => { e.stopPropagation(); onShare(achievement.id); }}
                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-lg leading-tight truncate">
            {achievement.title}
          </h4>
          {isUnlocked && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
        </div>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-2">
          {achievement.description}
        </p>
      </div>

      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            {categoryConfig?.emoji} {categoryConfig?.label}
          </span>
          <span>{achievement.points} PTS</span>
        </div>

        {!isUnlocked && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]">
              <span>PROGRESS</span>
              <span>{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} size="xs" className="h-1" />
          </div>
        )}

        {isUnlocked && userAchievement?.unlockedAt && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--card-border)]/50">
            <Trophy className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
              Unlocked <TimeAgo date={userAchievement.unlockedAt} />
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AchievementCard;
