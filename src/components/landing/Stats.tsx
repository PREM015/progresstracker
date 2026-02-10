'use client';

import React from 'react';
import { usePublicStats } from '@/hooks/usePublicStats';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsProps {
  className?: string;
}

export const Stats: React.FC<StatsProps> = ({
  className = '',
}) => {
  const { stats, isLoading } = usePublicStats();

  const statItems = [
    { value: stats.activeUsers, label: 'Active Users' },
    { value: stats.problemsTracked, label: 'Problems Tracked' },
    { value: stats.platformsSupported, label: 'Platforms Supported' },
    { value: stats.userSatisfaction, label: 'User Satisfaction' },
  ];

  if (isLoading) {
    return (
      <section className={`py-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white ${className}`}>
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="text-center flex flex-col items-center">
                <Skeleton className="h-12 w-32 bg-white/20 mb-2" />
                <Skeleton className="h-6 w-24 bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-20 bg-gradient-to-r from-indigo-600 to-purple-600 text-white ${className}`}>
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          {statItems.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-5xl font-bold mb-2">{stat.value}</div>
              <div className="text-lg opacity-90">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
