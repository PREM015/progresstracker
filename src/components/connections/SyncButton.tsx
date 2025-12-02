"use client";

import React, { useState } from "react";
import { toast } from "../ui/Toast";
import { useSync } from "@/hooks/useSync";
import { Button } from "../ui/Button";

interface SyncButtonProps {
  platformId: string;
}

const SyncButton: React.FC<SyncButtonProps> = ({ platformId }) => {
  const { syncPlatform } = useSync();
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      await syncPlatform(platformId);
      toast({ message: "Sync completed successfully!", type: "success" });
    } catch (error: any) {
      console.error(error);
      toast({
        message: error?.message || "Sync failed. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={loading}
      className="flex items-center justify-center gap-2"
      variant="default"
    >
      {loading ? "Syncing..." : "Sync"}
    </Button>
  );
};

export default SyncButton;
