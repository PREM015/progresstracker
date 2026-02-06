"use client";

import { useSession } from "next-auth/react";
import PlatformCard from "@/components/platforms/PlatformCard";
import PlatformList from "@/components/platforms/PlatformList";
import SyncHistoryList from "@/components/platforms/SyncHistoryList";

export default function PlatformsPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Connected Platforms</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PlatformList />
          </div>

          <div className="space-y-6">
            <PlatformCard
              platform={{
                id: "leetcode",
                name: "LeetCode",
                slug: "leetcode",
                icon: "💻",
                category: "Coding",
                isConnected: false,
              }}
            />
            <SyncHistoryList platformId="leetcode" />
          </div>
        </div>
      </div>
    </div>
  );
}
