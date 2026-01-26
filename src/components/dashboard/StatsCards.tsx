'use client';

import Card from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Code2, Briefcase, GitCommit, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardsProps {
  stats: {
    totalProblems: number;
    totalApplications?: number;
    totalCommits?: number;
    currentStreak: number;
    problemsChange?: number;
    applicationsChange?: number;
    commitsChange?: number;
    streakChange?: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Problems Solved',
      value: stats.totalProblems,
      change: stats.problemsChange || 0,
      icon: Code2,
      gradient: 'from-blue-600 to-cyan-500',
      bgGradient: 'from-blue-600/10 to-cyan-500/10',
      iconBg: 'bg-blue-600/20',
      textColor: 'text-blue-600',
      unit: 'problems',
    },
    {
      title: 'Job Applications',
      value: stats.totalApplications || 0,
      change: stats.applicationsChange || 0,
      icon: Briefcase,
      gradient: 'from-emerald-600 to-teal-500',
      bgGradient: 'from-emerald-600/10 to-teal-500/10',
      iconBg: 'bg-emerald-600/20',
      textColor: 'text-emerald-600',
      unit: 'applications',
    },
    {
      title: 'GitHub Commits',
      value: stats.totalCommits || 0,
      change: stats.commitsChange || 0,
      icon: GitCommit,
      gradient: 'from-violet-600 to-purple-500',
      bgGradient: 'from-violet-600/10 to-purple-500/10',
      iconBg: 'bg-violet-600/20',
      textColor: 'text-violet-600',
      unit: 'commits',
    },
    {
      title: 'Current Streak',
      value: stats.currentStreak,
      change: stats.streakChange || 0,
      icon: Flame,
      gradient: 'from-orange-600 to-red-500',
      bgGradient: 'from-orange-600/10 to-red-500/10',
      iconBg: 'bg-orange-600/20',
      textColor: 'text-orange-600',
      unit: 'days',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const isPositive = card.change >= 0;

        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
          >
            <Card className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.bgGradient} border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 group p-6`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {card.title}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${card.iconBg}`}>
                  <Icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
              </div>

              {/* Main Value */}
              <div className="mb-4">
                <p className="text-5xl font-bold text-gray-900 dark:text-white">
                  {card.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  {card.unit}
                </p>
              </div>

              {/* Change Indicator */}
              {card.change !== 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {isPositive ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        +{card.change}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {card.change}
                      </span>
                    </>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">this week</span>
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
