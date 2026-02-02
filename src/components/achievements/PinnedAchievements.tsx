/**
 * Component: PinnedAchievements
 * Location: components/achievements/PinnedAchievements.tsx
 * 
 * Description: Profile summary widget for pinned achievements
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Pin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AchievementBadge } from './AchievementBadge';
import { UserAchievement } from '@/types/achievement';

export interface PinnedAchievementsProps {
  pinned: UserAchievement[];
  onShowAll?: () => void;
  className?: string;
}

export const PinnedAchievements: React.FC<PinnedAchievementsProps> = ({
  pinned,
  onShowAll,
  className,
}) => {
  return (
    <div className={cn('p-6 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm relative overflow-hidden', className)}>
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
            <Pin className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--foreground)]">Pinned Trophies</h3>
        </div>

        {onShowAll && (
          <button
            onClick={onShowAll}
            className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            All Journey
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {pinned.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-black/5 dark:bg-white/5 rounded-2xl border border-dashed border-[var(--card-border)]">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">No Pinned Achievements</p>
          <p className="text-[10px] text-[var(--text-muted)]/60 mt-1">Unlock & Pin trophies here</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-around gap-6 relative z-10">
          {pinned.map((ua, index) => (
            <motion.div
              key={ua.id}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.1, type: 'spring', damping: 15 }}
              whileHover={{ scale: 1.1, y: -5 }}
              className="relative group cursor-pointer"
            >
              <AchievementBadge
                achievement={ua.achievement}
                isUnlocked={true}
                size="md"
                showTooltip={true}
                animate={false}
              />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-black text-white whitespace-nowrap pointer-events-none">
                {ua.achievement.title}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Decorative dots background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, var(--foreground) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
    </div>
  );
};

export default PinnedAchievements;
