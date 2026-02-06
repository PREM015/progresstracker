'use client';

import React, { useState, useEffect } from 'react';

interface AchievementItem {
  id: string;
  title: string;
  icon?: string | null;
  unlockedAt: string;
  tier: string;
}

interface AchievementsSummaryProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface RecentAchievementsResponse {
  achievements: Array<{
    id: string;
    unlockedAt: string;
    achievement: {
      title: string;
      tier: string;
      icon: string | null;
    };
  }>;
}

export const AchievementsSummary: React.FC<AchievementsSummaryProps> = ({
  className = '',
}) => {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAchievements = async () => {
      try {
        const res = await fetch('/api/achievements/recent?limit=5');
        const json = (await res.json()) as ApiSuccess<RecentAchievementsResponse>;
        if (!res.ok || !json?.success) {
          throw new Error('Failed to fetch recent achievements');
        }

        const mapped = (json.data?.achievements || []).map((item) => ({
          id: item.id,
          title: item.achievement?.title || 'Achievement',
          icon: item.achievement?.icon || null,
          unlockedAt: item.unlockedAt,
          tier: (item.achievement?.tier || 'bronze').toLowerCase(),
        }));

        if (isMounted) {
          setAchievements(mapped);
        }
      } catch (error) {
        console.error('Failed to load achievements:', error);
        if (isMounted) {
          setAchievements([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAchievements();

    return () => {
      isMounted = false;
    };
  }, []);

  const tierColors: Record<string, string> = {
    bronze: 'from-amber-600 to-amber-700',
    silver: 'from-gray-400 to-gray-500',
    gold: 'from-yellow-400 to-yellow-500',
  };

  const getTierColor = (tier: string) => tierColors[tier] || 'from-indigo-500 to-indigo-600';

  if (loading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Recent Achievements</h3>
        <button className="text-sm text-indigo-600 hover:text-indigo-700">View All</button>
      </div>

      {achievements.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-sm uppercase tracking-widest mb-2">No achievements</div>
          Keep building and your achievements will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r ${getTierColor(achievement.tier)} text-white`}
            >
              <div className="text-3xl font-semibold">
                {achievement.icon || 'AC'}
              </div>
              <div className="flex-1">
                <div className="font-bold">{achievement.title}</div>
                <div className="text-sm opacity-90">
                  Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="text-xs px-3 py-1 bg-white/20 rounded-full capitalize">
                {achievement.tier}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AchievementsSummary;
