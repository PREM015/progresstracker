"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">👤</span>
          <p className="mt-4 text-gray-500">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl">
              {profile.image ? (
                <img src={profile.image} alt={profile.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>👤</span>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold">{profile.name || profile.username}</h1>
              <p className="text-xl opacity-90 mt-1">@{profile.username}</p>
              {profile.bio && <p className="mt-2 opacity-80">{profile.bio}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600">{profile.stats?.totalProblems || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Problems Solved</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">{profile.stats?.currentStreak || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Day Streak 🔥</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{profile.stats?.achievements || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Achievements</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">{profile.stats?.rank || 'N/A'}</div>
            <div className="text-sm text-gray-600 mt-1">Global Rank</div>
          </div>
        </div>

        {profile.achievements && profile.achievements.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Recent Achievements</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {profile.achievements.slice(0, 6).map((achievement: any) => (
                <div key={achievement.id} className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="font-bold text-gray-900">{achievement.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{achievement.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.platforms && profile.platforms.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Connected Platforms</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {profile.platforms.map((platform: any) => (
                <div key={platform.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{platform.icon || '🌐'}</span>
                  <span className="font-medium text-gray-900">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
