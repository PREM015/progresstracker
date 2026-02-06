"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function UserGoalsPage() {
  const params = useParams();
  const username = params.username as string;

  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/profile/${username}/goals`)
      .then(r => r.json())
      .then(data => setGoals(data.goals || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [username]);

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
        <h1 className="text-4xl font-bold mb-8">@{username}'s Goals</h1>

        {goals.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">🎯</span>
            <p className="mt-4 text-gray-500">No public goals yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {goals.map(goal => (
              <div key={goal.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{goal.title}</h3>
                {goal.description && (
                  <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
                )}

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{goal.currentValue || 0} / {goal.targetValue}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min(((goal.currentValue || 0) / goal.targetValue) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className={`px-2 py-1 rounded ${goal.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      goal.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                    {goal.status}
                  </span>
                  {goal.targetDate && (
                    <span>Due: {new Date(goal.targetDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
