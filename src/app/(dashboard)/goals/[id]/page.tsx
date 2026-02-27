"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<any>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/goals/${goalId}`).then(r => r.json()),
      fetch(`/api/goals/${goalId}/progress`).then(r => r.json())
    ])
      .then(([goalData, progressData]) => {
        setGoal(goalData.goal);
        setProgress(progressData.progress || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [goalId]);

  const deleteGoal = async () => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
    router.push('/goals');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🎯</span>
          <p className="mt-4 text-gray-500">Goal not found</p>
        </div>
      </div>
    );
  }

  const progressPercent = ((goal.currentValue || 0) / goal.targetValue) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">{goal.title}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/goals/${goalId}/edit`)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Edit Goal
            </button>
            <button
              onClick={deleteGoal}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-sm text-gray-600 mb-1">Current Progress</div>
            <div className="text-3xl font-bold text-indigo-600">{goal.currentValue || 0}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-sm text-gray-600 mb-1">Target</div>
            <div className="text-3xl font-bold text-gray-900">{goal.targetValue}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-sm text-gray-600 mb-1">Progress</div>
            <div className="text-3xl font-bold text-green-600">{Math.round(progressPercent)}%</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <div className="mb-4">
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>

          {goal.description && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700">{goal.description}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Status: </span>
              <span className={`px-2 py-1 rounded ${goal.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                  goal.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                }`}>
                {goal.status}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Type: </span>
              <span className="font-medium text-gray-900">{goal.type}</span>
            </div>
            {goal.targetDate && (
              <div>
                <span className="text-gray-600">Target Date: </span>
                <span className="font-medium text-gray-900">
                  {new Date(goal.targetDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {goal.platform && (
              <div>
                <span className="text-gray-600">Platform: </span>
                <span className="font-medium text-gray-900">{goal.platform.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-6">Progress History</h2>
          {progress.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No progress entries yet</p>
          ) : (
            <div className="space-y-4">
              {progress.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">
                      {entry.oldValue} → {entry.newValue} {goal.unit}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-green-600 font-medium">
                    +{entry.newValue - entry.oldValue}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
