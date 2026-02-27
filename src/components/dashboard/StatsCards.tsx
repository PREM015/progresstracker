'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface StatsCardData {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'flat';
  icon?: React.ReactNode;
}

interface StatsCardsProps {
  stats: StatsCardData[];
  className?: string;
  isLoading?: boolean;
}

export function StatsCards({ stats = [], className, isLoading = false }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="bg-white border border-zinc-200 rounded-xl p-6 animate-pulse">
            <div className="h-10 w-10 bg-zinc-100 rounded-lg mb-4" />
            <div className="h-6 bg-zinc-100 rounded w-2/3 mb-2" />
            <div className="h-4 bg-zinc-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats.length) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {stats.map((stat) => (
        <div key={stat.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              {stat.icon ? stat.icon : (
                <span className="text-sm font-semibold">
                  {stat.label.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {stat.change !== undefined && (
              <div className={cn(
                "flex items-center text-sm font-bold gap-0.5",
                stat.trend === 'up' ? "text-emerald-600 dark:text-emerald-400" :
                  stat.trend === 'down' ? "text-red-600 dark:text-red-400" : "text-zinc-500"
              )}>
                {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                {stat.trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                {stat.trend === 'flat' && <Minus className="w-4 h-4" />}
                {Math.abs(stat.change)}%
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;
