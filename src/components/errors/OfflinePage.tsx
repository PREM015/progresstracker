'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);

    // Event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnection = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center shadow-2xl"
      >
        <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-zinc-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">No Internet Connection</h2>
        <p className="text-zinc-400 mb-8">
          It looks like you're offline. Please check your internet connection and try again.
        </p>

        <Button
          onClick={checkConnection}
          className="w-full bg-white text-black hover:bg-zinc-200"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload Page
        </Button>
      </motion.div>
    </div>
  );
}
