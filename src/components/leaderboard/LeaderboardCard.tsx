'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Trophy, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LeaderboardCardProps {
  user: {
    rank: number;
    username: string;
    avatar?: string;
    score: number;
    change: number;
  };
  className?: string;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  user,
  className = '',
}) => {
  const isTop3 = user.rank <= 3;

  const rankColors = {
    1: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
    2: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20',
    3: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  }[user.rank] || 'bg-white text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800';

  const RankIcon = {
    1: Crown,
    2: Medal,
    3: Medal
  }[user.rank];

  return (
    <div className={cn(
      "relative flex items-center p-4 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
      rankColors,
      "backdrop-blur-md",
      className
    )}>
      {/* Rank Badge */}
      <div className={cn(
        "flex shrink-0 items-center justify-center w-12 h-12 rounded-xl text-xl font-bold mr-4 shadow-sm",
        isTop3 ? "bg-white/50 dark:bg-black/20" : "bg-zinc-100 dark:bg-zinc-800"
      )}>
        {RankIcon ? <RankIcon className="w-6 h-6" /> : <span className="text-lg">#{user.rank}</span>}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-950 shadow-sm">
            <AvatarImage src={user.avatar} alt={user.username} />
            <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="truncate">
            <div className="font-bold text-lg leading-none truncate">{user.username}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium opacity-80">
          {user.change !== 0 && (
            <div className={cn("flex items-center gap-0.5", user.change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {user.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(user.change)}</span>
            </div>
          )}
          {user.change === 0 && (
            <div className="flex items-center gap-0.5 opacity-60">
              <Minus className="w-3 h-3" />
              <span>No change</span>
            </div>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-right">
        <div className="text-2xl font-bold tracking-tight font-mono">{user.score.toLocaleString()}</div>
        <div className="text-[10px] opacity-70 uppercase tracking-wider font-medium">Points</div>
      </div>

      {/* Glow Effect for Top 1 */}
      {user.rank === 1 && (
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-yellow-500/20 via-orange-500/10 to-transparent blur-xl rounded-2xl opacity-50" />
      )}
    </div>
  );
};

export default LeaderboardCard;
