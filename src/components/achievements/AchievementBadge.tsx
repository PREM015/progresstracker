// src/components/achievements/AchievementBadge.tsx
'use client';

import { memo, useMemo } from 'react';
import type { AchievementRarity, AchievementTier } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface AchievementBadgeProps {
  icon: string;
  rarity: AchievementRarity;
  tier?: AchievementTier;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isUnlocked?: boolean;
  showGlow?: boolean;
  showTier?: boolean;
  className?: string;
  onClick?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RARITY_STYLES: Record<AchievementRarity, { bg: string; border: string; glow: string }> = {
  common: {
    bg: 'bg-gradient-to-br from-gray-100 to-gray-200',
    border: 'border-gray-300',
    glow: 'shadow-gray-300/50',
  },
  uncommon: {
    bg: 'bg-gradient-to-br from-green-100 to-green-200',
    border: 'border-green-400',
    glow: 'shadow-green-400/50',
  },
  rare: {
    bg: 'bg-gradient-to-br from-blue-100 to-blue-200',
    border: 'border-blue-400',
    glow: 'shadow-blue-400/50',
  },
  epic: {
    bg: 'bg-gradient-to-br from-purple-100 to-purple-200',
    border: 'border-purple-400',
    glow: 'shadow-purple-400/50',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100',
    border: 'border-yellow-400',
    glow: 'shadow-yellow-400/60',
  },
};

const SIZE_STYLES: Record<string, { container: string; icon: string; tier: string }> = {
  xs: { container: 'w-8 h-8', icon: 'text-sm', tier: 'text-[8px] -bottom-1 -right-1 w-3 h-3' },
  sm: { container: 'w-10 h-10', icon: 'text-lg', tier: 'text-[10px] -bottom-1 -right-1 w-4 h-4' },
  md: { container: 'w-14 h-14', icon: 'text-2xl', tier: 'text-xs -bottom-1 -right-1 w-5 h-5' },
  lg: { container: 'w-20 h-20', icon: 'text-4xl', tier: 'text-sm -bottom-2 -right-2 w-6 h-6' },
  xl: { container: 'w-28 h-28', icon: 'text-5xl', tier: 'text-base -bottom-2 -right-2 w-8 h-8' },
};

const TIER_ICONS: Record<AchievementTier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '💠',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AchievementBadge = memo(function AchievementBadge({
  icon,
  rarity,
  tier = 'bronze',
  size = 'md',
  isUnlocked = true,
  showGlow = false,
  showTier = false,
  className = '',
  onClick,
}: AchievementBadgeProps) {
  const styles = useMemo(() => {
    const rarityStyle = RARITY_STYLES[rarity];
    const sizeStyle = SIZE_STYLES[size];

    return {
      container: `
        relative inline-flex items-center justify-center rounded-full
        border-2 ${rarityStyle.border} ${rarityStyle.bg}
        ${sizeStyle.container}
        ${isUnlocked ? '' : 'grayscale opacity-50'}
        ${showGlow && isUnlocked ? `shadow-lg ${rarityStyle.glow}` : ''}
        ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
        transition-all duration-200
      `,
      icon: sizeStyle.icon,
      tier: sizeStyle.tier,
    };
  }, [rarity, size, isUnlocked, showGlow, onClick]);

  return (
    <div
      className={`${styles.container} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <span className={styles.icon} role="img" aria-label="achievement icon">
        {icon}
      </span>

      {showTier && isUnlocked && (
        <span
          className={`
            absolute flex items-center justify-center
            rounded-full bg-white border border-gray-200 shadow-sm
            ${styles.tier}
          `}
        >
          {TIER_ICONS[tier]}
        </span>
      )}

      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
          <svg className="w-1/3 h-1/3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V8a3 3 0 00-6 0v4m0 0h6m-6 0H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-3" />
          </svg>
        </div>
      )}
    </div>
  );
});

export default AchievementBadge;