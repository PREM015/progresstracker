'use client';

import React, { useState, useEffect } from 'react';
import { Medal, Crown, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  change?: number;
}

interface LeaderboardTableProps {
  category?: string;
  timeRange?: 'day' | 'week' | 'month' | 'all';
  limit?: number;
  className?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  category,
  timeRange = 'week',
  limit = 50,
  className = '',
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({
      ...(category && { category }),
      timeRange,
      limit: limit.toString(),
    });

    fetch(`/api/leaderboard?${params}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEntries(data);
        } else if (data.success && Array.isArray(data.data)) {
          setEntries(data.data);
        } else if (data.success && Array.isArray(data.data?.entries)) {
          setEntries(data.data.entries);
        } else {
          setEntries([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch leaderboard:', err);
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [category, timeRange, limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-white/50 dark:bg-zinc-900/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl shadow-sm", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {entries.map((entry, index) => {
              const isTop3 = entry.rank <= 3;
              return (
                <motion.tr
                  key={entry.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01, backgroundColor: "rgba(160, 124, 254, 0.05)" }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                  className="group transition-colors cursor-default border-b border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center w-8">
                      {entry.rank === 1 && <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500/20 drop-shadow-sm" />}
                      {entry.rank === 2 && <Medal className="w-6 h-6 text-zinc-400 fill-zinc-400/20 drop-shadow-sm" />}
                      {entry.rank === 3 && <Medal className="w-6 h-6 text-amber-700 fill-amber-700/20 drop-shadow-sm" />}
                      {!isTop3 && <span className="text-zinc-500 font-bold font-mono text-sm">#{entry.rank}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <Avatar className={cn("h-10 w-10 border-2", isTop3 ? "border-indigo-100 dark:border-indigo-900" : "border-transparent")}>
                        <AvatarImage src={entry.avatar} alt={entry.username} />
                        <AvatarFallback className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold">
                          {entry.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className={cn("block font-semibold", isTop3 ? "text-zinc-900 dark:text-zinc-50 text-base" : "text-zinc-700 dark:text-zinc-300 text-sm")}>
                          {entry.username}
                        </span>
                        {/* <span className="text-xs text-zinc-400">Level 5</span>  -- Add level if available */}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-base">
                      {entry.score.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {entry.change !== undefined && (
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${entry.change > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        entry.change < 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                          'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                        {entry.change > 0 ? <TrendingUp className="w-3 h-3" /> :
                          entry.change < 0 ? <TrendingDown className="w-3 h-3" /> :
                            <Minus className="w-3 h-3" />}
                        <span>{Math.abs(entry.change)}</span>
                      </div>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardTable;
