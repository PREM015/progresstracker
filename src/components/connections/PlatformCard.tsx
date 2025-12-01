"use client";

import { useState } from "react";
import  Button  from "@/components/ui/Button";
import Badge  from "@/components/ui/Badge";
import ConnectModal from "./ConnectModal";

interface Platform {
  id: string;
  name: string;
  category: string;
  icon: string;
}

interface PlatformCardProps {
  platform: Platform;
}

export default function PlatformCard({ platform }: PlatformCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    setShowModal(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      DSA: "blue",
      DEVELOPMENT: "green",
      JOBS: "purple",
      LEARNING: "orange",
      HACKATHONS: "pink",
      DESIGN: "indigo",
      PRODUCTS: "yellow",
    };
    return colors[category] || "gray";
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
        {/* Platform Icon & Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-4xl">{platform.icon}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {platform.name}
            </h3>
            <Badge variant={getCategoryColor(platform.category)} size="sm">
              {platform.category}
            </Badge>
          </div>
        </div>

        {/* Connect Button */}
        <Button
          onClick={handleConnect}
          className="w-full"
          variant={isConnected ? "outline" : "default"}
        >
          {isConnected ? "Connected" : "Connect"}
        </Button>
      </div>

      {/* Connect Modal */}
      {showModal && (
        <ConnectModal
          platform={platform}
          onClose={() => setShowModal(false)}
          onConnect={() => {
            setIsConnected(true);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}