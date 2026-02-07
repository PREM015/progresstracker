import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Target } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  dueDate: string;
}

interface GoalsSummaryProps {
  goals?: Goal[];
}

export function GoalsSummary({ goals = [] }: GoalsSummaryProps) {
  return (
    <Card className="col-span-4 md:col-span-2 lg:col-span-1 w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Active Goals</CardTitle>
          <CardDescription>Track your targets</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/goals">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 mt-2">
        {goals.length === 0 ? (
          <EmptyState
            title="No active goals"
            description="Set a goal to stay motivated!"
            variant="small"
            icon={Target}
          />
        ) : (
          goals.map((goal) => {
            const percent = Math.round((goal.current / goal.target) * 100);
            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[150px] sm:max-w-xs">{goal.title}</span>
                  <span className="text-muted-foreground">{percent}%</span>
                </div>
                <Progress value={percent} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{goal.current} / {goal.target}</span>
                  <span>{goal.dueDate}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
