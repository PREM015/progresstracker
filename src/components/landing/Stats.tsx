'use client';

import React from 'react';
import { usePublicStats } from '@/hooks/usePublicStats';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Users, CheckCircle, Monitor, Star } from 'lucide-react';

interface StatsProps {
  className?: string;
}

export const Stats: React.FC<StatsProps> = ({
  className = '',
}) => {
  const { stats, isLoading } = usePublicStats();

  const statItems = [
    { value: stats.activeUsers, label: 'Active Users', icon: <Users className="w-6 h-6" /> },
    { value: stats.problemsTracked, label: 'Problems Tracked', icon: <CheckCircle className="w-6 h-6" /> },
    { value: stats.platformsSupported, label: 'Platforms Supported', icon: <Monitor className="w-6 h-6" /> },
    { value: stats.userSatisfaction, label: 'User Satisfaction', icon: <Star className="w-6 h-6" /> },
  ];

  if (isLoading) {
    return (
      <section className={`py-20 bg-background border-y border-border/50 ${className}`}>
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="flex flex-col items-center justify-center p-6 space-y-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-20 bg-background relative border-y border-border/50 ${className}`}>
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {statItems.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative group p-6 text-center rounded-2xl bg-white/50 dark:bg-zinc-900/50 border border-border backdrop-blur-sm hover:border-primary/50 transition-colors shadow-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="p-4 bg-primary/10 rounded-full text-primary mb-4 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="text-4xl md:text-5xl font-bold mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                  {stat.value}
                </div>
                <div className="text-muted-foreground font-medium text-sm tracking-wide uppercase">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
