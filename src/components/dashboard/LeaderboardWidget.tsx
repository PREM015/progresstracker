'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardUser {
  id: string;
  rank: number;
  name: string;
  username: string;
  image?: string | null;
  score: number;
  streak: number;
  isCurrentUser?: boolean;
}

interface LeaderboardWidgetProps {
  className?: string;
  type?: 'global' | 'weekly' | 'friends';
}

const rankIcons: Record<number, { icon: typeof Trophy; color: string }> = {
  1: { icon: Crown, color: 'text-yellow-400' },
  2: { icon: Medal, color: 'text-zinc-300' },
  3: { icon: Medal, color: 'text-amber-600' },
};

export function LeaderboardWidget({
  className,
  type = 'weekly'
}: LeaderboardWidgetProps) {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/leaderboard/${type}?limit=5`);
        const json = await res.json();

        if (res.ok && json?.success) {
          if (isMounted) {
            setUsers(json.data?.users || []);
            setCurrentUserRank(json.data?.currentUserRank || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLeaderboard();
    return () => { isMounted = false; };
  }, [type]);

  if (loading) {
    return (
      <div className={cn("glass-card p-6 animate-pulse", className)}>
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-6 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                {type === 'weekly' ? 'Weekly' : type === 'friends' ? 'Friends' : 'Global'} Leaders
              </h3>
              <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                Top performers
              </p>
            </div>
          </div>

          <Link
            href="/leaderboard"
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-1 group"
          >
            Full Board <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Leaderboard List */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Users className="w-10 h-10 text-zinc-400 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-900 dark:text-white font-bold">No Data Yet</p>
              <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">Be the first to climb the ranks!</p>
            </div>
          ) : (
            users.map((user, idx) => {
              const RankIcon = rankIcons[user.rank]?.icon || Trophy;
              const rankColor = rankIcons[user.rank]?.color || 'text-zinc-500';

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + idx * 0.05 }}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-xl border transition-all",
                    user.isCurrentUser
                      ? "bg-primary/10 border-primary/30"
                      : "bg-zinc-100 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                  )}
                >
                  {/* Rank */}
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    {user.rank <= 3 ? (
                      <RankIcon className={cn("w-5 h-5", rankColor)} />
                    ) : (
                      <span className="text-sm font-black text-zinc-500">#{user.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 border border-black/10 dark:border-white/10 overflow-hidden shrink-0">
                    {user.image ? (
                      <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-bold truncate",
                        user.isCurrentUser ? "text-primary dark:text-primary" : "text-zinc-900 dark:text-white"
                      )}>
                        {user.name}
                      </span>
                      {user.isCurrentUser && (
                        <span className="text-[8px] font-black text-primary bg-primary/20 px-1.5 py-0.5 rounded uppercase">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500">
                      @{user.username}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-zinc-900 dark:text-white">{user.score.toLocaleString()}</div>
                    <div className="text-[9px] font-bold text-zinc-500 uppercase">pts</div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Current User Position (if not in top 5) */}
        {currentUserRank && currentUserRank > 5 && (
          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Your Position</span>
              <span className="font-black text-primary">#{currentUserRank}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default LeaderboardWidget;