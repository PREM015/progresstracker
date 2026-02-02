/**
 * Component: AchievementUnlock
 * Location: components/achievements/AchievementUnlock.tsx
 * 
 * Description: Premium celebration overlay for newly unlocked achievements
 */

'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import { AchievementBadge } from './AchievementBadge';
import { Achievement, RARITY_CONFIG } from '@/types/achievement';
import { Button } from '@/components/ui/Button';

export interface AchievementUnlockProps {
  achievement: Achievement;
  onClose: () => void;
  className?: string;
}

export const AchievementUnlock: React.FC<AchievementUnlockProps> = ({
  achievement,
  onClose,
  className,
}) => {
  const rarityConfig = RARITY_CONFIG[achievement.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common;

  useEffect(() => {
    // Trigger confetti on mount
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('fixed inset-0 z-[9999] flex items-center justify-center p-4', className)}>
      {/* Immersive backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl"
      />

      {/* Main Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[var(--card-bg)] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        {/* Animated Background Rays */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-t from-[var(--primary)] to-transparent animate-pulse" />
        </div>

        <div className="relative z-10 p-10 flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mb-8"
          >
            <AchievementBadge achievement={achievement} size="xl" showTooltip={false} animate={true} />
          </motion.div>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-5 h-5 fill-amber-400" />
                <span className="text-xs font-black uppercase tracking-[0.4em]">Achievement Unlocked</span>
                <Sparkles className="w-5 h-5 fill-amber-400" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight leading-tight">
                {achievement.title}
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-zinc-400 font-medium text-lg leading-relaxed max-w-xs mx-auto"
            >
              {achievement.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-4 pt-4"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-black text-white">{achievement.points}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Points</span>
              </div>
              <div className="h-8 w-px bg-white/10 mx-2" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-black text-emerald-400">+{achievement.xpReward}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">XP Reward</span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-10 w-full"
          >
            <Button
              onClick={onClose}
              className="w-full h-14 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-sm shadow-xl"
            >
              Continue Your Journey
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AchievementUnlock;
