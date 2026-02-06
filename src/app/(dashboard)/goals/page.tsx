"use client";

import { useState } from "react";
import GoalsList from "@/components/goals/GoalsList";
import GoalForm from "@/components/goals/GoalForm";
import GoalStats from "@/components/goals/GoalStats";
import GoalFilters from "@/components/goals/GoalFilters";
import GoalTemplates from "@/components/goals/GoalTemplates";

export default function GoalsPage() {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Goals</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + New Goal
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {showForm && (
              <GoalForm
                onSubmit={() => setShowForm(false)}
                onCancel={() => setShowForm(false)}
              />
            )}

            <GoalFilters
              currentFilter={filter}
              onChange={setFilter}
            />

            <GoalsList filter={filter} />
          </div>

          <div className="space-y-6">
            <GoalStats />
            <GoalTemplates />
          </div>
        </div>
      </div>
    </div>
  );
}
