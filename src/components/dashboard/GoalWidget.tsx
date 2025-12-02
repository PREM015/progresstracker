'use client';

import  Card  from '@/components/ui/Card';
import  Progress  from '@/components/ui/Progress';
import { Target, TrendingUp } from 'lucide-react';
import  Button  from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface Goal {
  id: string;
  title: string;
  target: number;
  progress: number;
  deadline?: Date;
}

interface GoalWidgetProps {
  goals: Goal[];
}

export function GoalWidget({ goals }: GoalWidgetProps) {
  const router = useRouter();
  const activeGoals = goals.filter((g) => g.progress < g.target).slice(0, 3);

  if (activeGoals.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Active Goals</h3>
          <Target className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No active goals yet</p>
          <Button onClick={() => router.push('/goals')} size="sm">
            Create Your First Goal
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Active Goals</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/goals')}
        >
          View All
        </Button>
      </div>

      <div className="space-y-4">
        {activeGoals.map((goal) => {
          const percentage = Math.round((goal.progress / goal.target) * 100);
          const daysLeft = goal.deadline
            ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{goal.title}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {goal.progress}/{goal.target}
                </span>
              </div>
              
              <Progress value={percentage} className="h-2" />
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {percentage}% complete
                </span>
                {daysLeft !== null && (
                  <span>
                    {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}