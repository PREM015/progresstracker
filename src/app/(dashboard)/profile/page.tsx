"use client";

import { useState, useEffect } from "react";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileGoals from "@/components/profile/ProfileGoals";
import ProfileActivity from "@/components/profile/ProfileActivity";
import ProfilePlatforms from "@/components/profile/ProfilePlatforms";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileBadges from "@/components/profile/ProfileBadges";
import ProfileAchievements from "@/components/profile/ProfileAchievements";
import ShareProfile from "@/components/profile/ShareProfile";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    // Fetch user profile data
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => setProfileData(data))
      .catch(err => console.error('Failed to fetch profile:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <ProfileHeader user={profileData.user} />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProfileStats />
            <ProfileGoals goals={profileData.goals || []} />
            <ProfileActivity activities={profileData.activities || []} />
            <ProfilePlatforms platforms={profileData.platforms || []} />
          </div>

          <div className="space-y-6">
            <ProfileBadges />
            <ProfileAchievements achievements={profileData.achievements || []} />
            <ShareProfile profileUrl={`${window.location.origin}/${profileData.user?.username}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
