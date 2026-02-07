'use client';

import { PlatformCard, PlatformConfig } from './PlatformCard';
import { Code, Terminal, Box, Globe } from 'lucide-react';
import { useState } from 'react';
import { ConnectionModal } from '@/components/platforms/ConnectionModal';

interface PlatformListProps {
  platforms?: PlatformConfig[];
}

export function PlatformList({ platforms = [] }: PlatformListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const handleConnect = (id: string) => {
    setSelectedPlatform(id);
    setIsModalOpen(true);
  };

  const handleDisconnect = (id: string) => {
    console.log('Disconnecting', id);
  };

  const handleSync = (id: string) => {
    console.log('Syncing', id);
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {platforms.map(platform => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
          />
        ))}
      </div>

      {selectedPlatform && (
        <ConnectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          platformId={selectedPlatform}
        />
      )}
    </>
  );
}
