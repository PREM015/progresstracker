'use client';

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Trophy, LayoutGrid, Award, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicUserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/profile/${username}`)
      .then(r => r.json())
      .then(data => setProfile(data.profile))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center pt-20">
        <div className="w-full max-w-5xl px-4 space-y-8">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="flex gap-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="space-y-2 flex-1 pt-8">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">👤</span>
          <p className="mt-4 text-zinc-500">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <ProfileHeader
          user={{
            ...profile,
            avatar: profile.image,
            joinedAt: profile.createdAt || new Date().toISOString(),
          }}
        />

        <Tabs defaultValue="overview" className="mt-12">
          <TabsList className="bg-transparent border-b border-zinc-200 dark:border-zinc-800 w-full justify-start h-auto p-0 rounded-none gap-6">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none px-0 py-3 text-base text-zinc-500 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 hover:text-zinc-900 dark:hover:text-zinc-300 transition-all"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none px-0 py-3 text-base text-zinc-500 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 hover:text-zinc-900 dark:hover:text-zinc-300 transition-all"
            >
              <Activity className="w-4 h-4 mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none px-0 py-3 text-base text-zinc-500 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 hover:text-zinc-900 dark:hover:text-zinc-300 transition-all"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Achievements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8 space-y-8 animate-in fly-in-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-zinc-500">Problems Solved</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{profile.stats?.totalProblems || 0}</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-zinc-500">Day Streak</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{profile.stats?.currentStreak || 0} <span className="text-lg text-zinc-400 font-normal">days</span></div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-zinc-500">Achievements</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{profile.stats?.achievements || 0}</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-zinc-500">Global Rank</span>
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">#{profile.stats?.rank || 'N/A'}</div>
              </div>
            </div>

            {/* Connected Platforms */}
            {profile.platforms && profile.platforms.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Connected Platforms</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {profile.platforms.map((platform: any) => (
                    <div key={platform.id} className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                      <div className="text-2xl p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">{platform.icon || '🌐'}</div>
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-50">{platform.name}</div>
                        <div className="text-xs text-zinc-500">Sync Active</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="achievements">
            {/* Reuse existing logic but better styled */}
            {profile.achievements && profile.achievements.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                {profile.achievements.map((achievement: any) => (
                  <div key={achievement.id} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500/50 transition-colors group">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 origin-left">{achievement.icon}</div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-50 text-lg mb-1">{achievement.title}</div>
                    <div className="text-sm text-zinc-500">{achievement.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500">
                No achievements earned yet.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
