// src/components/achievements/AchievementDetails.tsx
'use client';

import { memo, useState, useEffect, useCallback, useTransition } from 'react';
import type { Achievement, UserAchievement, AchievementProgress } from '@/types/achievement';
import { RARITY_CONFIG, TIER_CONFIG, CATEGORY_CONFIG, type AchievementCategory } from '@/types/achievement';

// =============================================================================
// TYPES
// =============================================================================

interface AchievementDetailsProps {
  achievement: Achievement;
  userAchievement?: UserAchievement | null;
  progress?: AchievementProgress | null;
  isOpen: boolean;
  onClose: () => void;
  onPin?: (id: string) => Promise<void>;
  onShare?: (achievement: Achievement) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AchievementDetails = memo(function AchievementDetails({
  achievement,
  userAchievement,
  progress,
  isOpen,
  onClose,
  onPin,
  onShare,
}: AchievementDetailsProps) {
  const [isPinned, setIsPinned] = useState(userAchievement?.isPinned ?? false);
  const [isPending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(false);

  const isUnlocked = !!userAchievement;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const tierConfig = TIER_CONFIG[achievement.tier];
  const categoryKey = achievement.category as unknown as AchievementCategory;
  const categoryConfig = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.special;

  const progressPercent = progress?.percentage ?? (isUnlocked ? 100 : 0);
  const currentValue = progress?.current ?? (isUnlocked ? achievement.requirement.value : 0);
  const targetValue = progress?.target ?? achievement.requirement.value;

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handlePin = useCallback(async () => {
    if (!onPin || !isUnlocked) return;
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    startTransition(async () => {
      try {
        await onPin(achievement.id);
      } catch {
        setIsPinned(!newPinned);
      }
    });
  }, [onPin, isUnlocked, isPinned, achievement.id]);

  const handleShare = useCallback(() => {
    onShare?.(achievement);
  }, [onShare, achievement]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-300 transform
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
        `}
      >
        {/* Header Background */}
        <div
          className="h-32 relative"
          style={{
            background: `linear-gradient(135deg, ${rarityConfig.color}20, ${rarityConfig.color}40)`,
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white text-gray-600 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>

          {/* Achievement Icon */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div
              className={`
                w-24 h-24 flex items-center justify-center rounded-2xl
                border-4 border-white shadow-lg text-4xl
                ${isUnlocked ? rarityConfig.bgClass : 'bg-gray-100 grayscale'}
              `}
            >
              {achievement.icon}
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                  <LockIcon className="w-8 h-8 text-gray-500" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-14 pb-6 px-6">
          {/* Title & Description */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{achievement.title}</h2>
            <p className="mt-2 text-gray-600">{achievement.description}</p>
          </div>

          {/* Badges */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${rarityConfig.bgClass} ${rarityConfig.textClass}`}>
              {rarityConfig.emoji} {rarityConfig.label}
            </span>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
              {tierConfig.icon} {tierConfig.label}
            </span>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
              {categoryConfig.emoji} {categoryConfig.label}
            </span>
          </div>

          {/* Progress */}
          {!isUnlocked && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">{progressPercent}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-center text-sm text-gray-500">
                {currentValue} / {targetValue} {achievement.requirement.metric.replace(/_/g, ' ')}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-indigo-600">+{achievement.points}</div>
              <div className="text-xs text-gray-500 mt-1">Points</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">+{achievement.xpReward}</div>
              <div className="text-xs text-gray-500 mt-1">XP</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-700">{targetValue}</div>
              <div className="text-xs text-gray-500 mt-1">Target</div>
            </div>
          </div>

          {/* Unlock Date */}
          {isUnlocked && userAchievement?.unlockedAt && (
            <div className="mb-6 p-4 bg-green-50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                <CheckCircleIcon className="w-5 h-5" />
                Unlocked
              </div>
              <div className="mt-1 text-sm text-green-700">
                {formatDate(userAchievement.unlockedAt)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {isUnlocked && onPin && (
              <button
                onClick={handlePin}
                disabled={isPending}
                className={`
                  flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2
                  ${isPinned
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                  disabled:opacity-50
                `}
              >
                <PinIcon className="w-5 h-5" filled={isPinned} />
                {isPinned ? 'Pinned' : 'Pin'}
              </button>
            )}
            {isUnlocked && onShare && (
              <button
                onClick={handleShare}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShareIcon className="w-5 h-5" />
                Share
              </button>
            )}
            {!isUnlocked && (
              <div className="flex-1 py-3 px-4 rounded-xl text-center text-gray-500 bg-gray-100">
                Keep going! {targetValue - currentValue} more to unlock
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function PinIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export const AchievementModal = AchievementDetails;
export default AchievementDetails;