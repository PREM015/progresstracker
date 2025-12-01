"use client";

import { useState, useEffect } from "react";
import PlatformCard from "./PlatformCard";
import  Spinner from "@/components/ui/Spinner";

interface Platform {
  id: string;
  name: string;
  category: string;
  icon: string;
}

export default function PlatformGrid() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const response = await fetch("/api/platforms");
      const data = await response.json();
      setPlatforms(data.platforms || []);
    } catch (error) {
      console.error("Failed to fetch platforms:", error);
    } finally {
      setLoading(false);
    }
  };

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
          <PlatformCard key={platform.id} platform={platform} />
        ))
      )}
    </div>
  );
}