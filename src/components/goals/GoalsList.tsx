'use client';

import React from 'react';
import { useGoals } from '@/hooks/useGoals';
import { FilterState } from './GoalFilters';
import { GoalCard } from './GoalCard';
import { GoalStatus, GoalCategory } from '@/types/goal';
import { GoalService } from '@/services/api/goal.service';
import { Target, AlertTriangle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface GoalsListProps {
  userId: string;
  filters: FilterState;
  className?: string;
  onEdit?: (goal: any) => void;
  refreshTrigger?: number;
}

export const GoalsList: React.FC<GoalsListProps> = ({
  userId,
  filters,
  className = '',
  onEdit,
  refreshTrigger = 0,
}) => {
  const { goals, isLoading, error, refetch } = useGoals({
    ...filters,
    status: filters.status as GoalStatus | undefined,
    category: filters.category as GoalCategory | undefined,
  });

  React.useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse border border-zinc-200 dark:border-zinc-800" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/30 dark:bg-rose-950/20">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-500 mb-4" />
        <h3 className="text-lg font-semibold text-rose-700 dark:text-rose-400 mb-2">Failed to load goals</h3>
        <p className="text-sm text-rose-600/80 dark:text-rose-400/80 mb-6">{(error as Error).message}</p>
        <Button onClick={() => refetch()} variant="outline" className="border-rose-200 hover:bg-rose-100 text-rose-600">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      await GoalService.deleteGoal(id);
      refetch();
    } catch (err) {
      console.error('Failed to delete goal', err);
      // Optional: Add toast notification here
    }
  };

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {goals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50"
          >
            <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-900/20 mb-4 text-indigo-500">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">No goals found</h3>
            <p className="text-zinc-500 max-w-sm mb-6">
              You haven't created any goals that match your filters yet. Start by creating a new goal!
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {goals.map((goal, index) => (
              <GoalCard
                key={goal.id}
                goal={goal as any}
                className="w-full"
                onEdit={(id) => {
                  const goalToEdit = goals.find((g) => g.id === id);
                  if (goalToEdit && onEdit) onEdit(goalToEdit);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalsList;
