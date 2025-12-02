'use client';

import  Card  from '@/components/ui/Card';

import { TrendingUp, TrendingDown, Code2, Briefcase, GitCommit, Flame } from 'lucide-react';

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
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Applications Sent',
      value: stats.totalApplications || 0,
      change: stats.applicationsChange || 0,
      icon: Briefcase,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Commits Made',
      value: stats.totalCommits || 0,
      change: stats.commitsChange || 0,
      icon: GitCommit,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: 'Current Streak',
      value: stats.currentStreak,
      change: stats.streakChange || 0,
      icon: Flame,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      suffix: ' days',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.change >= 0;

        return (
          <Card key={card.title} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {card.title}
                </p>
                <p className="text-3xl font-bold mt-2">
                  {card.value}
                  {card.suffix && <span className="text-lg">{card.suffix}</span>}
                </p>
                {card.change !== 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {card.change}%
                    </span>
                    <span className="text-sm text-gray-500">vs last month</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}