'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Medal, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string | React.ReactNode;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  className?: string;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  className = '',
}) => {
  const tierStyles = {
    bronze: 'from-orange-700/20 to-orange-900/5 text-orange-700 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/30',
    silver: 'from-slate-400/20 to-slate-600/5 text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-slate-700/30',
    gold: 'from-yellow-500/20 to-yellow-700/5 text-yellow-700 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-700/30',
    platinum: 'from-indigo-500/20 to-purple-500/5 text-indigo-700 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-700/30',
  };

  const progressPercentage = Math.min(100, (achievement.progress / achievement.target) * 100);

  return (
    <div
      className={cn(
        "relative group overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300",
        achievement.unlocked
          ? "bg-white/60 dark:bg-zinc-900/60 shadow-sm hover:shadow-md hover:scale-[1.02]"
          : "bg-white/30 dark:bg-zinc-950/30 grayscale-[0.8] hover:grayscale-0",
        tierStyles[achievement.tier].split(' ').filter(c => c.startsWith('border')).join(' '),
        className
      )}
    >
      {/* Background Gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        tierStyles[achievement.tier].split(' ').filter(c => c.startsWith('from')).join(' ')
      )} />

      <div className="relative p-5">
        <div className="flex justify-between items-start mb-4">
          <div className={cn(
            "p-3 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm",
            "shadow-inner"
          )}>
            {/* Placeholder for Icon if string, or render node */}
            <span className="text-3xl filter drop-shadow-sm">
              {achievement.icon}
            </span>
          </div>
          {achievement.unlocked ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unlocked</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/20 text-xs font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Locked</span>
            </div>
          )}
        </div>

        <h3 className={cn(
          "text-lg font-bold mb-1",
          achievement.unlocked ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"
        )}>
          {achievement.title}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed">
          {achievement.description}
        </p>

        {/* Progress System */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="h-2 w-full bg-white/50 dark:bg-zinc-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-black/5 dark:border-white/5 relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full shadow-sm",
                achievement.unlocked ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-zinc-400 dark:bg-zinc-600"
              )}
            />
          </div>
          <div className="text-right text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
            {achievement.progress} / {achievement.target}
          </div>
        </div>

        {/* Unlocked Date */}
        {achievement.unlocked && achievement.unlockedAt && (
          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 text-xs text-zinc-500 flex items-center gap-1">
            <Medal className="w-3 h-3 text-amber-500" />
            <span>Earned on {new Date(achievement.unlockedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementCard;