/**
 * Component: AchievementsList
 * Location: components/achievements/AchievementsList.tsx
 * 
 * Description: Main grid layout for achievements with rich staggered animations
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Grid, List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AchievementCard } from './AchievementCard';
import { Achievement, UserAchievement, AchievementProgress } from '@/types/achievement';
import { EmptyState } from '@/components/ui/EmptyState';

export interface AchievementsListProps {
  achievements: Achievement[];
  userAchievements: Record<string, UserAchievement>;
  progressMap: Record<string, AchievementProgress>;
  viewMode?: 'grid' | 'compact';
  isLoading?: boolean;
  onAchievementClick?: (achievement: Achievement) => void;
  className?: string;
}

export const AchievementsList: React.FC<AchievementsListProps> = ({
  achievements,
  userAchievements,
  progressMap,
  viewMode = 'grid',
  isLoading = false,
  onAchievementClick,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={cn(
        'grid gap-6',
        viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
      )}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse border border-[var(--card-border)]" />
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <EmptyState
        icon={<Grid className="w-12 h-12" />}
        title="No Achievements Found"
        description="Try adjusting your filters or keep coding to unlock more!"
      />
    );
  }

  return (
    <div className={cn(
      'grid gap-6',
      viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1',
      className
    )}>
      {achievements.map((achievement, index) => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
          userAchievement={userAchievements[achievement.id]}
          progress={progressMap[achievement.id]}
          index={index}
          onClick={() => onAchievementClick?.(achievement)}
        />
      ))}
    </div>
  );
};

export default AchievementsList;
