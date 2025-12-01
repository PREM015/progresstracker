"use client";

import  Progress  from "@/components/ui/Progress";

interface Goal {
  id: string;
  title: string;
  target: number;
  progress: number;
  deadline?: Date | null;
  completedAt?: Date | null;
}

export default function GoalCard({ goal }: { goal: Goal }) {
  const percentage = Math.round((goal.progress / goal.target) * 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {goal.title}
      </h3>
      <div className="space-y-3">
        <Progress value={percentage} />
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {goal.progress} / {goal.target}
          </span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {percentage}%
          </span>
        </div>
        {goal.completedAt && (
          <div className="text-green-600 dark:text-green-400 text-sm font-medium">
            ✓ Completed
          </div>
        )}
      </div>
    </div>
  );
}