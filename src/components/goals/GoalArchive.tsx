'use client';

import React, { useState, useEffect } from 'react';

interface ArchivedGoal {
  id: string;
  title: string;
  status: 'completed' | 'failed' | 'cancelled';
  finalProgress: number;
  archivedAt: string;
}

interface GoalArchiveProps {
  className?: string;
}

export const GoalArchive: React.FC<GoalArchiveProps> = ({
  className = '',
}) => {
  const [archivedGoals, setArchivedGoals] = useState<ArchivedGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/goals/archived')
      .then(r => r.json())
      .then(data => setArchivedGoals(data))
      .finally(() => setLoading(false));
  }, []);

  const restoreGoal = async (id: string) => {
    await fetch(`/api/goals/${id}/restore`, { method: 'POST' });
    setArchivedGoals(archivedGoals.filter(g => g.id !== id));
  };

  const permanentlyDelete = async (id: string) => {
    if (confirm('Permanently delete this goal? This cannot be undone.')) {
      await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      setArchivedGoals(archivedGoals.filter(g => g.id !== id));
    }
  };

  if (loading) {
    return <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📦</span>
        <h3 className="text-xl font-bold text-gray-900">Archived Goals</h3>
      </div>

      <div className="space-y-3">
        {archivedGoals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No archived goals</div>
        ) : (
          archivedGoals.map((goal) => (
            <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                        goal.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                      }`}>
                      {goal.status}
                    </span>
                    <span>Progress: {goal.finalProgress}%</span>
                    <span>Archived: {new Date(goal.archivedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => restoreGoal(goal.id)}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Restore
                </button>
                <button
                  onClick={() => permanentlyDelete(goal.id)}
                  className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GoalArchive;
