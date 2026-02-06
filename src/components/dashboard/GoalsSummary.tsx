'use client';

import React, { useState, useEffect } from 'react';

interface GoalSummary {
  total: number;
  completed: number;
  active: number;
  completionRate: number;
  recentGoals: Array<{
    id: string;
    title: string;
    progress: number;
    deadline: string | null;
  }>;
}

interface GoalsSummaryProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

export const GoalsSummary: React.FC<GoalsSummaryProps> = ({
  className = '',
}) => {
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/goals/summary');
        const json = (await res.json()) as ApiSuccess<GoalSummary>;
        if (!res.ok || !json?.success) {
          throw new Error('Failed to fetch goals summary');
        }

        if (isMounted) {
          setSummary(json.data);
        }
      } catch (error) {
        console.error('Failed to load goals summary:', error);
        if (isMounted) {
          setSummary(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  if (!summary) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Goals Summary</h3>
        <button className="text-sm text-indigo-600 hover:text-indigo-700">View All</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">{summary.total}</div>
          <div className="text-xs text-gray-600">Total Goals</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600">{summary.completed}</div>
          <div className="text-xs text-gray-600">Completed</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-3xl font-bold text-purple-600">{summary.active}</div>
          <div className="text-xs text-gray-600">Active</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Completion Rate</span>
          <span className="font-bold text-gray-900">{summary.completionRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
            style={{ width: `${summary.completionRate}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 text-sm">Recent Goals</h4>
        {summary.recentGoals && summary.recentGoals.length > 0 ? (
          summary.recentGoals.map((goal) => (
            <div key={goal.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm truncate">{goal.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{goal.progress}%</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            No recent goals to display
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsSummary;
