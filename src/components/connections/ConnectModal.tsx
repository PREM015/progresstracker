"use client";

import { useState } from "react";
import  Modal  from "@/components/ui/Modal";
import  Button  from "@/components/ui/Button";
import  Input  from "@/components/ui/Input";

interface Platform {
  id: string;
  name: string;
  category: string;
  icon: string;
}

interface ConnectModalProps {
  platform: Platform;
  onClose: () => void;
  onConnect: () => void;
}

export default function ConnectModal({
  platform,
  onClose,
  onConnect,
}: ConnectModalProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformId: platform.id,
          username,
        }),
      });

      if (response.ok) {
        onConnect();
      }
    } catch (error) {
      console.error("Failed to connect platform:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Connect {platform.name}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Enter your {platform.name} username to connect your account
        </p>

        <Input
          type="text"
          placeholder={`${platform.name} username`}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-6"
        />

        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            className="flex-1"
            disabled={!username || loading}
          >
            {loading ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}