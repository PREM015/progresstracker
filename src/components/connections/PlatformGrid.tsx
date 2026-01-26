"use client";

import { useState, useEffect } from "react";
import PlatformCard from "./PlatformCard";
import  Spinner from "@/components/ui/Spinner";

interface Platform {
  id: string;
  name: string;
  category: string;
  icon: string;
  slug?: string;
  displayName?: string;
  color?: string;
  website?: string;
}

interface PlatformGridProps {
  platforms: Platform[];
  connectedPlatforms: string[];
  onConnect: (platformId: string, username?: string, token?: string) => Promise<void>;
  onDisconnect: (platformId: string) => Promise<void>;
}

export default function PlatformGrid({
  platforms: initialPlatforms = [],
  connectedPlatforms = [],
  onConnect,
  onDisconnect,
}: PlatformGridProps) {
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [loading, setLoading] = useState(!initialPlatforms.length);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    if (initialPlatforms.length) {
      setPlatforms(initialPlatforms);
      setLoading(false);
    }
  }, [initialPlatforms]);

  const filteredPlatforms =
    selectedCategory === "ALL"
      ? platforms
      : platforms.filter((p) => p.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredPlatforms.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No platforms found in this category
          </p>
        </div>
      ) : (
        filteredPlatforms.map((platform) => (
          <PlatformCard 
            key={platform.id} 
            platform={platform}
            isConnected={connectedPlatforms.includes(platform.id)}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        ))
      )}
    </div>
  );
}