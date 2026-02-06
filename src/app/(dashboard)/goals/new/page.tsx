"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GoalForm from "@/components/goals/GoalForm";

export default function NewGoalPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (data: any) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const result = await response.json();
        router.push(`/goals/${result.goal.id}`);
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Create New Goal</h1>
          <p className="text-gray-600 mt-2">Set a new milestone to track your progress</p>
        </div>

        <GoalForm
          onSubmit={handleCreate}
          onCancel={() => router.push('/goals')}
          isSubmitting={isCreating}
        />
      </div>
    </div>
  );
}
