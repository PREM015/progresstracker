// src/components/achievements/AchievementUnlock.tsx
'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import type { Achievement, AchievementNotification } from '@/types/achievement';
import { RARITY_CONFIG, TIER_CONFIG } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface AchievementUnlockProps {
  notification: AchievementNotification | null;
  onDismiss: () => void;
  onView?: (achievement: Achievement) => void;
  onShare?: (achievement: Achievement) => void;
  autoHideDelay?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AchievementUnlock = memo(function AchievementUnlock({
  notification,
  onDismiss,
  onView,
  onShare,
  autoHideDelay = 8000,
}: AchievementUnlockProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (notification) {
      // Small delay for animation
      const showTimer = setTimeout(() => setIsVisible(true), 50);

      // Auto hide
      const hideTimer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    } else {
      setIsVisible(false);
      setIsExiting(false);
    }
  }, [notification, autoHideDelay]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onDismiss();
    }, 300);
  }, [onDismiss]);

  const handleView = useCallback(() => {
    if (notification) {
      onView?.(notification.achievement);
      handleDismiss();
    }
  }, [notification, onView, handleDismiss]);

  const handleShare = useCallback(() => {
    if (notification) {
      onShare?.(notification.achievement);
    }
  }, [notification, onShare]);

  if (!notification || !isVisible) return null;

  const { achievement, pointsEarned, xpEarned } = notification;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const tierConfig = TIER_CONFIG[achievement.tier];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pointer-events-none">
      <div
        className={`
          relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto
          transform transition-all duration-300 ease-out
          ${isExiting ? 'opacity-0 -translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'}
        `}
      >
        {/* Confetti Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-1/2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 opacity-10 animate-spin-slow" />
        </div>

        {/* Top Gradient Bar */}
        <div
          className="h-2"
          style={{
            background: `linear-gradient(90deg, ${rarityConfig.color}, ${tierConfig.color})`,
          }}
        />

        {/* Content */}
        <div className="relative p-6">
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium mb-3">
              🎉 Achievement Unlocked!
            </div>
          </div>

          {/* Achievement Icon - Animated */}
          <div className="flex justify-center mb-4">
            <div
              className={`
                relative w-24 h-24 flex items-center justify-center rounded-2xl
                ${rarityConfig.bgClass} border-4 ${rarityConfig.borderClass}
                shadow-lg animate-bounce-slow
              `}
            >
              <span className="text-5xl">{achievement.icon}</span>
              <div className="absolute -top-2 -right-2 text-2xl animate-pulse">
                ✨
              </div>
            </div>
          </div>

          {/* Achievement Info */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {achievement.title}
            </h3>
            <p className="text-gray-600">
              {achievement.description}
            </p>
          </div>

          {/* Rewards */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">+{pointsEarned}</div>
              <div className="text-xs text-gray-500">Points</div>
            </div>
            {xpEarned > 0 && (
              <>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">+{xpEarned}</div>
                  <div className="text-xs text-gray-500">XP</div>
                </div>
              </>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${rarityConfig.bgClass} ${rarityConfig.textClass}`}>
              {rarityConfig.emoji} {rarityConfig.label}
            </span>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
              {tierConfig.icon} {tierConfig.label}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {onView && (
              <button
                onClick={handleView}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                View Details
              </button>
            )}
            {onShare && (
              <button
                onClick={handleShare}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShareIcon className="w-5 h-5" />
                Share
              </button>
            )}
          </div>
        </div>

        {/* Animated particles */}
        <Particles />
      </div>
    </div>
  );
});

// =============================================================================
// PARTICLES ANIMATION
// =============================================================================

function Particles() {
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    size: `${4 + Math.random() * 4}px`,
    color: ['#FFD700', '#FF69B4', '#7B68EE', '#00CED1'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-0 animate-float-up"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// ICONS
// =============================================================================

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}


export default AchievementUnlock;