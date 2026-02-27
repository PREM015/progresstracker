'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wrench, RefreshCw, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';

export default function MaintenancePage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ maintenance: boolean; message?: string } | null>(null);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = (await apiClient.get('/api/system/status')) as { data: { maintenance: boolean; message?: string } };
      if (res.data && !res.data.maintenance) {
        // If maintenance is over, redirect to home
        window.location.href = '/';
      } else {
        setStatus(res.data);
      }
    } catch (error) {
      console.error('Failed to check status', error);
      // Fallback if API fails (maybe API is down too)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Auto-check every minute
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full text-center space-y-8"
      >
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Wrench className="w-16 h-16 text-yellow-500" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            System Maintenance
          </h1>
          <p className="text-zinc-400 text-lg max-w-md mx-auto">
            {status?.message || "We're currently performing scheduled maintenance to improve our services. We'll be back shortly."}
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 max-w-sm mx-auto">
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm mb-4">
            <Clock className="w-4 h-4" />
            <span>Estimated completion: <strong>Soon</strong></span>
          </div>

          <Button
            onClick={checkStatus}
            disabled={loading}
            className="w-full bg-white text-black hover:bg-zinc-200"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
