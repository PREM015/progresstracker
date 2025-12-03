// src/components/connections/SyncButton.tsx

'use client';

import React from 'react';
import { RefreshCw, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSync } from '@/context/SyncContext';
import { cn } from '@/lib/utils';

interface SyncButtonProps {
  platformId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function SyncButton({
  platformId,
  variant = 'default',
  size = 'md',
  showLabel = true,
  className,
}: SyncButtonProps) {
  const { 
    isSyncing, 
    currentJob, 
    triggerSync, 
    triggerPlatformSync, 
    cancelSync,
    isLoading,
  } = useSync();

  const handleClick = async () => {
    if (isSyncing && currentJob) {
      await cancelSync(currentJob.id);
    } else if (platformId) {
      await triggerPlatformSync(platformId);
    } else {
      await triggerSync();
    }
  };

  const getIcon = () => {
    if (isLoading || isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return <RefreshCw className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (isSyncing && currentJob) {
      return `${currentJob.progress}%`;
    }
    if (isLoading) {
      return 'Starting...';
    }
    return platformId ? 'Sync' : 'Sync All';
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        sizeClasses[size],
        'gap-2',
        isSyncing && 'animate-pulse',
        className
      )}
    >
      {getIcon()}
      {showLabel && <span>{getLabel()}</span>}
    </Button>
  );
}

export default SyncButton;