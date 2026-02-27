"use client";

import { useState, useEffect } from "react";

export default function GoalsArchivePage() {
  const [archivedGoals, setArchivedGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/goals?status=ARCHIVED')
      .then(r => r.json())
      .then(data => setArchivedGoals(data.goals || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = async (goalId: string) => {
    try {
      await fetch(`/api/goals/${goalId}/restore`, { method: 'POST' });
      const data = await fetch('/api/goals?status=ARCHIVED').then(r => r.json());
      setArchivedGoals(data.goals || []);
    } catch (error) {
      console.error('Failed to restore goal:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Archived Goals</h1>

        {archivedGoals.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">📦</span>
            <p className="mt-4 text-gray-500">No archived goals</p>
            <p className="text-sm text-gray-400 mt-2">Goals you archive will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {archivedGoals.map(goal => (
              <div key={goal.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span>Archived {new Date(goal.updatedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{goal.currentValue || 0} / {goal.targetValue}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(goal.id)}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
