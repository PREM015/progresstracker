// src/components/goals/GoalHistory.tsx

'use client';

import React from 'react';
import { CheckCircle, Calendar, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Goal } from '@/types/goal';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GoalHistoryProps {
  goals: Goal[];
  maxDisplay?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export function GoalHistory({
  goals,
  maxDisplay = 10,
  showViewAll = true,
  onViewAll,
  className,
}: GoalHistoryProps) {
  const displayGoals = goals.slice(0, maxDisplay);

  if (goals.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No completed goals yet</p>
            <p className="text-sm">Complete your first goal to see it here!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Completed Goals
          </CardTitle>
          <Badge variant="success">{goals.length} completed</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayGoals.map((goal) => (
            <div
              key={goal.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{goal.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {goal.progress}/{goal.target}
                    </span>
                    {goal.completedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(goal.completedAt), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-green-600">
                  100%
                </Badge>
                {goal.completedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(goal.completedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {showViewAll && goals.length > maxDisplay && onViewAll && (
          <button
            onClick={onViewAll}
            className="w-full mt-4 text-sm text-primary hover:underline"
          >
            View all {goals.length} completed goals
          </button>
        )}
      </CardContent>
    </Card>
  );
}