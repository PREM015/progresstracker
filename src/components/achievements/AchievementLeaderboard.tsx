/**
 * Component: AchievementLeaderboard
 * Location: components/achievements/AchievementLeaderboard.tsx
 * 
 * Description: Premium leaderboard showing top achievement earners with rank indicators
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Crown, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  totalPoints: number;
  unlockedCount: number;
  rank: number;
}

export interface AchievementLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  className?: string;
}

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <div className="p-2 rounded-xl bg-amber-400 text-white shadow-lg shadow-amber-400/20"><Crown className="w-5 h-5 fill-white" /></div>;
  if (rank === 2) return <div className="p-2 rounded-xl bg-slate-300 text-white shadow-lg shadow-slate-300/20"><Medal className="w-5 h-5 fill-white" /></div>;
  if (rank === 3) return <div className="p-2 rounded-xl bg-orange-400 text-white shadow-lg shadow-orange-400/20"><Medal className="w-5 h-5 fill-white" /></div>;
  return <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-black text-sm w-9 h-9 flex items-center justify-center">{rank}</div>;
};

export const AchievementLeaderboard: React.FC<AchievementLeaderboardProps> = ({
  entries,
  currentUserId,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight">Global Leaderboard</h3>
          <p className="text-sm text-[var(--text-muted)] font-medium">Top achievement earners</p>
        </div>
        <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
          <Trophy className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((entry, index) => {
          const isCurrentUser = entry.userId === currentUserId;

          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300',
                isCurrentUser
                  ? 'bg-[var(--primary)]/5 border-[var(--primary)] shadow-sm'
                  : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--primary)]/30'
              )}
            >
              <div className="shrink-0">
                <RankBadge rank={entry.rank} />
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar src={entry.avatarUrl} name={entry.name} size="md" className="ring-2 ring-white/10" />
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    'font-bold truncate text-sm leading-none mb-1',
                    isCurrentUser ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'
                  )}>
                    {entry.name}
                    {isCurrentUser && <span className="ml-2 text-[10px] font-black uppercase text-[var(--primary)]/60">(You)</span>}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-tighter">
                    {entry.unlockedCount} Achievements
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-lg font-black text-[var(--foreground)] leading-none">
                  {entry.totalPoints.toLocaleString()}
                </span>
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                  Points
                </span>
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <ArrowUpRight className="w-4 h-4 text-[var(--primary)]" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementLeaderboard;
