// src/components/profile/PublicProfile.tsx

'use client';

import React from 'react';
import { 
  MapPin, 
  Link as LinkIcon, 
  Calendar, 
  Trophy, 
  Target,
  TrendingUp,
  Award
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

import  Avatar  from '@/components/ui/Avatar';
import  Badge  from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { format } from 'date-fns';

interface PublicProfileProps {
  user: {
    name: string;
    username: string;
    avatar?: string;
    bio?: string;
    location?: string;
    website?: string;
    createdAt: Date;
  };
  stats: {
    totalEntries: number;
    currentStreak: number;
    longestStreak: number;
    totalProblemsSolved: number;
    completedGoals: number;
    achievements: number;
  };
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    unlockedAt: Date;
  }>;
  recentGoals?: Array<{
    id: string;
    title: string;
    progress: number;
    target: number;
    status: string;
  }>;
  showStats?: boolean;
}

export function PublicProfile({
  user,
  stats,
  achievements = [],
  recentGoals = [],
  showStats = true,
}: PublicProfileProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <Avatar
              src={user.avatar}
              alt={user.name}
              sizes="2xl"
              className="mx-auto md:mx-0"
            />

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-1">{user.name}</h1>
              <p className="text-muted-foreground mb-3">@{user.username}</p>

              {user.bio && (
                <p className="text-sm mb-4 max-w-2xl">{user.bio}</p>
              )}

              <div className="flex flex-wrap gap-3 justify-center md:justify-start text-sm text-muted-foreground">
                {user.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {user.location}
                  </div>
                )}

                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Website
                  </a>
                )}

                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {format(user.createdAt, 'MMMM yyyy')}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {showStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-primary">
                  {stats.totalEntries}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total Entries
                </p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-orange-500">
                  {stats.currentStreak}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Current Streak
                </p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-green-500">
                  {stats.totalProblemsSolved}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Problems Solved
                </p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-blue-500">
                  {stats.completedGoals}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Goals Completed
                </p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-purple-500">
                  {stats.achievements}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Achievements
                </p>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-yellow-500">
                  {stats.longestStreak}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Longest Streak
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Goals */}
      {recentGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentGoals.map((goal) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{goal.title}</h3>
                    <Badge variant={goal.status === 'COMPLETED' ? 'success' : 'default'}>
                      {goal.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={(goal.progress / goal.target) * 100}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {goal.progress}/{goal.target}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.slice(0, 6).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium mb-1">{achievement.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {achievement.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Unlocked {format(achievement.unlockedAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}