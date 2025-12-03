// src/hooks/useAchievements.ts

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { 
  UserAchievement, 
  AchievementProgress, 
  AchievementStats,
  Achievement 
} from '@/types/achievement';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface UseAchievementsOptions {
  includeProgress?: boolean;
  includeStats?: boolean;
}

interface UseAchievementsReturn {
  achievements: UserAchievement[];
  progress: AchievementProgress[];
  stats: AchievementStats | null;
  availableAchievements: Achievement[];
  isLoading: boolean;
  error: Error | null;
  checkAchievements: () => Promise<UserAchievement[]>;
  refresh: () => Promise<void>;
}

export function useAchievements(
  options: UseAchievementsOptions = {}
): UseAchievementsReturn {
  const { includeProgress = true, includeStats = true } = options;
  const [isChecking, setIsChecking] = useState(false);

  const queryParams = new URLSearchParams();
  if (includeProgress) queryParams.set('progress', 'true');
  if (includeStats) queryParams.set('stats', 'true');

  const url = `/api/achievements?${queryParams.toString()}`;

  const { data, error, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  const { data: availableData } = useSWR('/api/achievements/available', fetcher, {
    revalidateOnFocus: false,
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      mutate(url),
      mutate('/api/achievements/available'),
    ]);
  }, [url]);

  const checkAchievements = useCallback(async (): Promise<UserAchievement[]> => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/achievements', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to check achievements');
      }

      const result = await response.json();
      await refresh();
      return result.newUnlocks || [];
    } finally {
      setIsChecking(false);
    }
  }, [refresh]);

  return {
    achievements: data?.achievements || [],
    progress: data?.progress || [],
    stats: data?.stats || null,
    availableAchievements: availableData?.achievements || [],
    isLoading: isLoading || isChecking,
    error,
    checkAchievements,
    refresh,
  };
}

export default useAchievements;