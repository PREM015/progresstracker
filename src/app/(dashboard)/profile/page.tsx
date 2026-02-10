"use client";

import React from 'react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfileActivity } from '@/components/profile/ProfileActivity';
import { ProfileBadges } from '@/components/profile/ProfileBadges';
import { ProfileAchievements } from '@/components/profile/ProfileAchievements';
import { ProfilePlatforms } from '@/components/profile/ProfilePlatforms';
import { useUser } from '@/hooks/useUser';
import { useAchievements } from '@/hooks/useAchievements';
import { usePlatforms } from '@/hooks/usePlatforms';

export default function ProfilePage() {
  const { user, isLoading: isLoadingUser } = useUser();
  const { unlocked: unlockedAchievements, isLoading: isLoadingAchievements } = useAchievements();
  const { available, connected, isLoading: isLoadingPlatforms } = usePlatforms();

  const isLoading = isLoadingUser || isLoadingAchievements || isLoadingPlatforms;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-gray-100 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-100 rounded-xl"></div>
          <div className="h-32 bg-gray-100 rounded-xl"></div>
          <div className="h-32 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Transform UserAchievement to Badge interface
  const badges = unlockedAchievements.map(ua => ({
    id: ua.achievement.id,
    name: ua.achievement.title,
    icon: ua.achievement.icon,
    description: ua.achievement.description,
    tier: ua.achievement.tier as 'bronze' | 'silver' | 'gold' | 'platinum',
    unlockedAt: new Date(ua.unlockedAt).toISOString(),
  }));

  // Transform UserAchievement to ProfileAchievements interface
  const recentAchievements = unlockedAchievements.map(ua => ({
    id: ua.achievement.id,
    name: ua.achievement.title,
    icon: ua.achievement.icon,
    tier: ua.achievement.tier as 'bronze' | 'silver' | 'gold',
    unlockedAt: new Date(ua.unlockedAt).toISOString(),
  }));

  // Transform Platforms
  const platformList = available?.map(p => {
    const isConnected = connected?.some(c => c.platformId === p.id) || false;
    const connection = connected?.find(c => c.platformId === p.id);
    return {
      name: p.name,
      username: connection?.username || '',
      connected: isConnected,
      stats: {
        problems: 0,
        commits: 0
      }
    };
  }) || [];

  return (
    <div className="space-y-6">
      <ProfileHeader
        user={{
          name: user.name || 'User',
          username: user.username || 'user',
          bio: user.bio,
          avatar: user.image,
          joinedAt: new Date(user.createdAt).toLocaleDateString(),
        }}
      />

      <ProfileStats userId={user.id} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProfileActivity activity={[]} /> {/* Activity requires separate hook or data source */}
          <ProfileBadges badges={badges} />
          <ProfileAchievements achievements={recentAchievements} />
        </div>

        <div className="space-y-6">
          <ProfilePlatforms platforms={platformList} />
        </div>
      </div>
    </div>
  );
}
