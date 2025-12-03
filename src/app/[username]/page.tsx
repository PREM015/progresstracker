// src/app/[username]/page.tsx

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PublicProfile } from '@/components/profile/PublicProfile';
import { ShareButton } from '@/components/profile/ShareButton';

interface PublicProfilePageProps {
  params: {
    username: string;
  };
}

async function getUserData(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      settings: true,
      _count: {
        select: {
          trackerEntries: true,
          goals: true,
          userAchievements: true,
        },
      },
    },
  });

  if (!user || !user.settings?.publicProfile) {
    return null;
  }

  // Get stats
  const [completedGoals, achievements, trackerEntries] = await Promise.all([
    prisma.goal.count({
      where: { userId: user.id, status: 'COMPLETED' },
    }),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
      take: 6,
    }),
    prisma.trackerEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 100,
    }),
  ]);

  // Calculate stats
  const totalProblemsSolved = trackerEntries.reduce(
    (sum, entry) => sum + (entry.problemsSolved || 0),
    0
  );

  const currentStreak = calculateStreak(trackerEntries);

  return {
    user: {
      name: user.name || '',
      username: user.username || '',
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      website: user.website,
      createdAt: user.createdAt,
    },
    stats: {
      totalEntries: user._count.trackerEntries,
      currentStreak,
      longestStreak: currentStreak,
      totalProblemsSolved,
      completedGoals,
      achievements: user._count.userAchievements,
    },
    achievements: achievements.map((ua) => ({
      id: ua.id,
      title: ua.achievement.title,
      description: ua.achievement.description,
      category: ua.achievement.category,
      unlockedAt: ua.unlockedAt,
    })),
    showStats: user.settings?.showStats ?? true,
  };
}

function calculateStreak(entries: any[]): number {
  if (entries.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const entry of entries) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const data = await getUserData(params.username);

  if (!data) {
    return {
      title: 'User Not Found',
    };
  }

  return {
    title: `${data.user.name} (@${data.user.username}) | CodeSync Pro`,
    description: data.user.bio || `Check out ${data.user.name}'s coding progress on CodeSync Pro`,
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const data = await getUserData(params.username);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto mb-6 flex justify-end">
        <ShareButton username={params.username} />
      </div>
      
      <PublicProfile {...data} />
    </div>
  );
}