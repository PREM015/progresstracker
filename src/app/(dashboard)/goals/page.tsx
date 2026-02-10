"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import GoalsList from "@/components/goals/GoalsList";
import GoalForm from "@/components/goals/GoalForm";
import GoalStats from "@/components/goals/GoalStats";
import GoalFilters, { FilterState } from "@/components/goals/GoalFilters";
import GoalTemplates from "@/components/goals/GoalTemplates";

export default function GoalsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";

  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [initialFormData, setInitialFormData] = useState<any>(null);

  const handleTemplateSelect = (template: any) => {
    setInitialFormData({
      title: template.title,
      description: template.description,
      category: template.category,
      targetValue: template.targetValue,
      deadline: new Date(Date.now() + template.suggestedDeadlineDays * 86400000).toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Goals</h1>
        <button
          onClick={() => {
            setInitialFormData(undefined);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + New Goal
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {showForm && (
            <GoalForm
              initialData={initialFormData || undefined}
              onSuccess={() => {
                setShowForm(false);
                // Trigger refresh if needed, or rely on GoalsList effect if dependence changes (maybe add a refresh trigger prop later)
                // For now just close form
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          <GoalFilters
            onFilterChange={setFilters}
          />

          <GoalsList userId={userId} filters={filters} />
        </div>

        <div className="space-y-6">
          <GoalStats userId={userId} />
          <GoalTemplates onSelectTemplate={handleTemplateSelect} />
        </div>
      </div>
    </div>
  );
}
