'use client';

import { PlatformConfig } from './PlatformCard';
import { PlatformCard } from './PlatformCard';
import { useState } from 'react';
import { ConnectionModal } from '@/components/platforms/ConnectionModal';

interface PlatformListProps {
  platforms?: PlatformConfig[];
  onConnectSubmit?: (id: string, data: Record<string, any>) => Promise<void>;
  onDisconnect?: (id: string) => void;
  onSync?: (id: string) => void;
}

export function PlatformList({
  platforms = [],
  onConnectSubmit,
  onDisconnect,
  onSync
}: PlatformListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const handleConnectClick = (id: string) => {
    setSelectedPlatform(id);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: Record<string, any>) => {
    if (selectedPlatform && onConnectSubmit) {
      await onConnectSubmit(selectedPlatform, data);
    }
  };

  const handleDisconnect = (id: string) => {
    if (onDisconnect) onDisconnect(id);
  };

  const handleSync = (id: string) => {
    if (onSync) onSync(id);
  };

  return (
    <>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-all duration-300">
        {platforms.map(platform => (
          <div key={platform.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <PlatformCard
              platform={platform}
              onConnect={handleConnectClick}
              onDisconnect={handleDisconnect}
              onSync={handleSync}
            />
          </div>
        ))}
      </div>

      {selectedPlatform && (
        <ConnectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          platformId={selectedPlatform}
          onSubmit={handleModalSubmit}
        />
      )}
    </>
  );
}
