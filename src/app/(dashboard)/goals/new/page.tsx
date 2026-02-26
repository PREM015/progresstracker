"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GoalForm from "@/components/goals/GoalForm";

export default function NewGoalPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Create New Goal</h1>
          <p className="text-gray-600 mt-2">Set a new milestone to track your progress</p>
        </div>

        <GoalForm
          onSuccess={() => router.push('/goals')}
          onCancel={() => router.push('/goals')}
        />
      </div>
    </div>
  );
}
