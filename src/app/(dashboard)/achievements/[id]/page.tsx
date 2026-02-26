// src/app/(dashboard)/achievements/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { Achievement, UserAchievement, AchievementProgress } from '@/types/achievement';
import { RARITY_CONFIG, TIER_CONFIG, CATEGORY_CONFIG, type AchievementCategory } from '@/types/achievement';

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function AchievementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const achievementId = params.id as string;

  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [userAchievement, setUserAchievement] = useState<UserAchievement | null>(null);
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [relatedAchievements, setRelatedAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/achievements/${achievementId}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Achievement not found');
        throw new Error('Failed to fetch achievement');
      }

      const data = await response.json();
      setAchievement(data.achievement);
      setUserAchievement(data.userAchievement || null);
      setProgress(data.progress || null);
      setRelatedAchievements(data.related || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [achievementId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handlePinToggle = useCallback(async () => {
    if (!userAchievement) return;

    const newPinned = !userAchievement.isPinned;
    setUserAchievement(prev => prev ? { ...prev, isPinned: newPinned } : null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/achievements/${achievementId}/pin`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to toggle pin');
      } catch {
        setUserAchievement(prev => prev ? { ...prev, isPinned: !newPinned } : null);
      }
    });
  }, [achievementId, userAchievement]);

  const handleShare = useCallback(async () => {
    if (!achievement) return;

    const shareText = `I ${userAchievement ? 'unlocked' : 'am working towards'} "${achievement.title}"!`;
    const shareUrl = `${window.location.origin}/achievements/${achievement.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: achievement.title, text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }, [achievement, userAchievement]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !achievement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error === 'Achievement not found' ? 'Achievement Not Found' : 'Something went wrong'}
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/achievements')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Achievements
          </button>
        </div>
      </div>
    );
  }

  const isUnlocked = !!userAchievement;
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const tierConfig = TIER_CONFIG[achievement.tier];
  const categoryKey = achievement.category as unknown as AchievementCategory;
  const categoryConfig = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.special;
  const progressPercent = progress?.percentage ?? (isUnlocked ? 100 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="relative h-64 sm:h-80"
        style={{
          background: `linear-gradient(135deg, ${rarityConfig.color}30, ${rarityConfig.color}60)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50" />

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg text-gray-700 hover:bg-white transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>

        {/* Share Button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg text-gray-700 hover:bg-white transition-colors"
          >
            <ShareIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Achievement Icon */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-10">
          <div
            className={`
              w-32 h-32 flex items-center justify-center rounded-3xl
              border-4 border-white shadow-xl text-6xl
              ${isUnlocked ? rarityConfig.bgClass : 'bg-gray-100 grayscale'}
            `}
          >
            {achievement.icon}
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-3xl">
                <LockIcon className="w-12 h-12 text-gray-500" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        {/* Title & Description */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{achievement.title}</h1>
          <p className="mt-3 text-lg text-gray-600">{achievement.description}</p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <span className={`px-4 py-1.5 text-sm font-medium rounded-full ${rarityConfig.bgClass} ${rarityConfig.textClass}`}>
            {rarityConfig.emoji} {rarityConfig.label}
          </span>
          <span className="px-4 py-1.5 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
            {tierConfig.icon} {tierConfig.label}
          </span>
          <span className="px-4 py-1.5 text-sm font-medium rounded-full bg-gray-100 text-gray-700">
            {categoryConfig.emoji} {categoryConfig.label}
          </span>
        </div>

        {/* Progress Section */}
        {!isUnlocked && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Progress</h2>
              <span className="text-2xl font-bold text-indigo-600">{progressPercent}%</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{progress?.current || 0} / {progress?.target || achievement.requirement.value}</span>
              <span>{(progress?.target || achievement.requirement.value) - (progress?.current || 0)} more to unlock</span>
            </div>
          </div>
        )}

        {/* Unlock Status */}
        {isUnlocked && userAchievement && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 text-green-700">
              <CheckCircleIcon className="w-8 h-8" />
              <div>
                <p className="font-semibold text-lg">Achievement Unlocked!</p>
                <p className="text-sm text-green-600">{formatDate(userAchievement.unlockedAt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-indigo-600">+{achievement.points}</div>
            <div className="text-sm text-gray-500 mt-1">Points</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">+{achievement.xpReward}</div>
            <div className="text-sm text-gray-500 mt-1">XP</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-gray-700">{achievement.requirement.value}</div>
            <div className="text-sm text-gray-500 mt-1">Target</div>
          </div>
        </div>

        {/* Requirement */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">How to Unlock</h2>
          <p className="text-gray-600">
            {`Reach ${achievement.requirement.value} ${achievement.requirement.metric.replace(/_/g, ' ')}`}
          </p>
        </div>

        {/* Actions */}
        {isUnlocked && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={handlePinToggle}
              disabled={isPending}
              className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${userAchievement?.isPinned
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
            >
              <PinIcon className="w-5 h-5" filled={userAchievement?.isPinned} />
              {userAchievement?.isPinned ? 'Pinned' : 'Pin to Profile'}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-3 px-4 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors"
            >
              <ShareIcon className="w-5 h-5" />
              Share Achievement
            </button>
          </div>
        )}

        {/* Related Achievements */}
        {relatedAchievements.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Achievements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedAchievements.map((related) => {
                const relatedRarity = RARITY_CONFIG[related.rarity];
                return (
                  <button
                    key={related.id}
                    onClick={() => router.push(`/achievements/${related.id}`)}
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all text-left"
                  >
                    <div className={`w-12 h-12 rounded-xl ${relatedRarity.bgClass} flex items-center justify-center text-2xl`}>
                      {related.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{related.title}</h3>
                      <p className={`text-sm ${relatedRarity.textClass}`}>{relatedRarity.label}</p>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-64 sm:h-80 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse relative">
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="w-32 h-32 rounded-3xl bg-gray-300 animate-pulse" />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="text-center mb-8">
          <div className="h-10 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
          <div className="h-6 w-96 max-w-full bg-gray-100 rounded mx-auto mt-4 animate-pulse" />
        </div>
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}

// =============================================================================
// ICONS
// =============================================================================

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

function PinIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}