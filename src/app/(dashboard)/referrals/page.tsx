```
"use client";

import { Metadata } from "next";
import { useState, useEffect } from "react";

// Assuming these components are defined elsewhere or will be imported
// For the purpose of this edit, we'll assume they exist.
// You might need to adjust these imports based on your project structure.
import ReferralDashboard from "./components/ReferralDashboard";
import ReferralLink from "./components/ReferralLink";
import ReferralList from "./components/ReferralList";
import ReferralStats from "./components/ReferralStats";
import ReferralRewards from "./components/ReferralRewards";

// Define types for the data, assuming they match the mock data structure
interface ReferralStatsData {
  totalReferrals: number;
  accepted: number;
  pending: number;
  rewards: number;
}

interface ReferralReward {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlocked: boolean;
}

interface Referral {
  id: string;
  email: string;
  status: "active" | "pending";
  signedUpAt?: string;
}

export default function ReferralsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStatsData | null>(null);
  const [rewards, setRewards] = useState<Refer ReferralReward[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate 1 second network delay

      // In a real application, you would fetch this data from your backend API
      // For example:
      // const response = await fetch('/api/referrals');
      // const data = await response.json();
      // setStats(data.stats);
      // setRewards(data.rewards);
      // setReferrals(data.referrals);

      // Using the previous mock data as fetched data for demonstration
      const fetchedStats: ReferralStatsData = {
        totalReferrals: 12,
        accepted: 8,
        pending: 4,
        rewards: 80,
      };

      const fetchedRewards: ReferralReward[] = [
        { id: "1", title: "First Referral", description: "Refer your first user", icon: "🎁", points: 10, unlocked: true },
        { id: "2", title: "5 Referrals", description: "Refer 5 users", icon: "🏆", points: 50, unlocked: false },
      ];

      const fetchedReferrals: Referral[] = [
        { id: "1", email: "friend@example.com", status: "active", signedUpAt: "2024-02-01" },
        { id: "2", email: "buddy@example.com", status: "pending" },
      ];

      setStats(fetchedStats);
      setRewards(fetchedRewards);
      setReferrals(fetchedReferrals);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <p className="text-xl text-gray-700">Loading referral data...</p>
      </div>
    );
  }

  // Ensure data is not null before rendering, though isLoading check should handle this
  if (!stats || !rewards || !referrals) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <p className="text-xl text-red-500">Error loading data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Referral Program</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ReferralDashboard />
            <ReferralLink code="JOHNDOE123" />
            <ReferralList referrals={referrals} />
          </div>

          <div className="space-y-6">
            <ReferralStats stats={stats} />
            <ReferralRewards rewards={rewards} />
          </div>
        </div>
      </div>
    </div>
  );
}
```
