/**
 * Component: AchievementBadge
 * Location: components/achievements/AchievementBadge.tsx
 * 
 * Description: Premium animated achievement badge with glassmorphism and rarity-based effects
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  Achievement,
  AchievementRarity,
  RARITY_CONFIG,
  TIER_CONFIG,
} from '@/types/achievement';

export interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTooltip?: boolean;
  animate?: boolean;
  className?: string;
}

const sizeStyles = {
  xs: 'w-8 h-8 text-xs ring-1',
  sm: 'w-10 h-10 text-sm ring-2',
  md: 'w-14 h-14 text-base ring-2',
  lg: 'w-20 h-20 text-2xl ring-[3px]',
  xl: 'w-28 h-28 text-4xl ring-4',
};

const rarityGradients: Record<AchievementRarity, string> = {
  common: 'from-slate-400 to-slate-600',
  uncommon: 'from-emerald-400 to-emerald-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-violet-500 via-purple-600 to-fuchsia-600',
  legendary: 'from-amber-400 via-orange-500 to-rose-500',
};

const rarityGlows: Record<AchievementRarity, string> = {
  common: 'shadow-slate-500/0',
  uncommon: 'shadow-emerald-500/20',
  rare: 'shadow-blue-500/20',
  epic: 'shadow-purple-500/40',
  legendary: 'shadow-amber-500/60 blur-[2px]',
};

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  isUnlocked = true,
  size = 'md',
  showTooltip = true,
  animate = true,
  className,
}) => {
  const { rarity, tier, icon, title } = achievement;
  const rarityConfig = RARITY_CONFIG[rarity as AchievementRarity] || RARITY_CONFIG.common;
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  const sizeClass = sizeStyles[size];

  const badgeContent = (
    <motion.div
      whileHover={animate ? { scale: 1.1, rotate: 5 } : {}}
      whileTap={animate ? { scale: 0.9 } : {}}
      className={cn(
        'relative flex items-center justify-center rounded-full transition-all duration-500',
        sizeClass,
        isUnlocked
          ? [
            'bg-gradient-to-br',
            rarityGradients[rarity as AchievementRarity] || rarityGradients.common,
            rarityGlows[rarity as AchievementRarity] || rarityGlows.common,
            'shadow-lg ring-[var(--card-bg)]',
          ]
          : 'bg-zinc-800/20 grayscale opacity-40 ring-zinc-700/50 backdrop-blur-sm',
        className
      )}
    >
      <span className={cn(
        'relative z-10 drop-shadow-md select-none transform transition-transform duration-300',
        isUnlocked ? 'text-white' : 'text-zinc-500'
      )}>
        {icon}
      </span>

      {/* Gloss Effect */}
      {isUnlocked && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
      )}

      {/* Legendary Shimmer */}
      {isUnlocked && rarity === 'legendary' && (
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 translate-x-full pointer-events-none"
        />
      )}

      {/* Tier Badge */}
      {isUnlocked && (
        <div className="absolute -bottom-1 -right-1 bg-white/10 backdrop-blur-md rounded-full px-1 shadow-sm border border-white/20">
          <span className="text-[10px] leading-none" title={tierConfig.label}>
            {tierConfig.emoji}
          </span>
        </div>
      )}
    </motion.div>
  );

  if (showTooltip) {
    return (
      <Tooltip content={
        <div className="text-center p-1">
          <p className="font-bold text-sm">{title}</p>
          <p className="text-[10px] uppercase tracking-wider opacity-70">
            {rarityConfig.label} • {tierConfig.label}
          </p>
        </div>
      }>
        {badgeContent}
      </Tooltip>
    );
  }

  return badgeContent;
};

export default AchievementBadge;
