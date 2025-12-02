'use client';

import  Button  from '@/components/ui/Button';
import { Plus, RefreshCw, Download, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickActionsProps {
  onSync?: () => void;
  isSyncing?: boolean;
}

export function QuickActions({ onSync, isSyncing = false }: QuickActionsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Button
        onClick={() => router.push('/tracker')}
        leftIcon={<Plus className="w-4 h-4" />}
        className="w-full"
      >
        Add Entry
      </Button>
      
      <Button
        onClick={onSync}
        leftIcon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />}
        variant="outline"
        className="w-full"
        isLoading={isSyncing}
      >
        Sync All
      </Button>
      
      <Button
        onClick={() => router.push('/goals')}
        leftIcon={<Target className="w-4 h-4" />}
        variant="outline"
        className="w-full"
      >
        Set Goal
      </Button>
      
      <Button
        onClick={() => router.push('/analytics')}
        leftIcon={<Download className="w-4 h-4" />}
        variant="outline"
        className="w-full"
      >
        Export Data
      </Button>
    </div>
  );
}