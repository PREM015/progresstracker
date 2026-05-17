"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import GoalsList from "@/components/goals/GoalsList";
import GoalForm from "@/components/goals/GoalForm";
import GoalStats from "@/components/goals/GoalStats";
import GoalFilters, { FilterState } from "@/components/goals/GoalFilters";
import GoalTemplates from "@/components/goals/GoalTemplates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Activity, Flame, Zap, Trophy, Target, Clock } from 'lucide-react';

export default function GoalsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";

  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTemplateSelect = (template: any) => {
    setInitialFormData({
      title: template.title,
      description: template.description,
      category: template.category,
      targetValue: template.targetValue,
      deadline: new Date(Date.now() + (template.estimatedDays || 7) * 86400000).toISOString().split('T')[0],
      unit: template.unit || 'units',
    });
    setShowForm(true);
  };

  const handleEditGoal = (goal: any) => {
    setInitialFormData({
      id: goal.id, // Ensure ID is passed if CreateGoalForm supports it, or handle separately
      title: goal.title,
      description: goal.description,
      targetValue: goal.target,
      currentValue: goal.progress, // or goal.currentValue if available
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
      category: goal.category,
      unit: goal.unit,
      priority: 'medium', // Default as it might be missing
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-300 dark:to-zinc-500">
            Goals & Milestones
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Set targets, track progress, and celebrate your achievements.
          </p>
        </div>
        <button
          onClick={() => {
            setInitialFormData(undefined);
            setShowForm(true);
          }}
          className="group relative px-6 py-3 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-2xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-zinc-200 dark:shadow-zinc-900 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Goal
          </span>
        </button>
      </div>

      {/* Progress Overview Grid - Moved to Top */}
      <GoalStats userId={userId} className="mb-2" />

      <div className="space-y-12">
        <GoalTemplates onSelectTemplate={handleTemplateSelect} />

        <div className="space-y-8">
          {showForm && (
            <GoalForm
              goalId={initialFormData?.id}
              initialData={initialFormData || undefined}
              onSuccess={() => {
                setShowForm(false);
                setRefreshTrigger(prev => prev + 1);
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          <GoalFilters
            onFilterChange={setFilters}
          />

          <GoalsList
            userId={userId}
            filters={filters}
            onEdit={handleEditGoal}
          />
        </div>
      </div>
    </div>
  );
}
