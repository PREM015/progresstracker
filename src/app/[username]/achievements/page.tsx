"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function UserAchievementsPage() {
  const params = useParams();
  const username = params.username as string;

  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/profile/${username}/achievements`)
      .then(r => r.json())
      .then(data => setAchievements(data.achievements || []))
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">@{username}'s Achievements</h1>

        {achievements.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🏆</span>
            <p className="mt-4 text-gray-500">No achievements yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {achievements.map(achievement => (
              <div key={achievement.id} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition">
                <div className="text-5xl mb-3">{achievement.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{achievement.title}</h3>
                <p className="text-xs text-gray-600 mb-3">{achievement.description}</p>
                <div className="text-xs text-gray-400">
                  Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
