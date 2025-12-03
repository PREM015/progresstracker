// src/components/goals/GoalProgress.tsx

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GoalProgressProps {
  current: number;
  target: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  className?: string;
}

export function GoalProgress({
  current,
  target,
  size = 'md',
  showLabel = true,
  showPercentage = true,
  color = 'blue',
  className,
}: GoalProgressProps) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isComplete = current >= target;

  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-sm', subtext: 'text-xs' },
    md: { container: 'w-24 h-24', text: 'text-lg', subtext: 'text-xs' },
    lg: { container: 'w-32 h-32', text: 'text-2xl', subtext: 'text-sm' },
  };

  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
  };

  const strokeColor = {
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    red: '#ef4444',
    purple: '#a855f7',
  };

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        className={cn(sizeClasses[size].container, '-rotate-90')}
        viewBox="0 0 100 100"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={isComplete ? '#22c55e' : strokeColor[color]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className={cn(
            sizeClasses[size].text,
            'font-bold',
            isComplete ? 'text-green-500' : colorClasses[color]
          )}>
            {percentage}%
          </span>
        )}
        {showLabel && (
          <span className={cn(sizeClasses[size].subtext, 'text-muted-foreground')}>
            {current}/{target}
          </span>
        )}
      </div>
    </div>
  );
}

export default GoalProgress;