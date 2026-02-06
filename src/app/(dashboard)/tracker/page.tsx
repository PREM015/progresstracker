"use client";

import { useState, useEffect } from "react";

export default function TrackerPage() {
  const [entry, setEntry] = useState({
    goalId: '',
    platformId: '',
    value: '',
    notes: '',
    entryDate: new Date().toISOString().split('T')[0],
  });
  const [goals, setGoals] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/goals').then(r => r.json()),
      fetch('/api/platforms/user').then(r => r.json()),
      fetch('/api/tracker/recent').then(r => r.json()),
    ])
      .then(([goalsData, platformsData, entriesData]) => {
        setGoals(goalsData.goals || []);
        setPlatforms(platformsData.platforms || []);
        setRecentEntries(entriesData.entries || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (response.ok) {
        const newEntry = await response.json();
        setRecentEntries([newEntry.entry, ...recentEntries]);
        setEntry({
          goalId: '',
          platformId: '',
          value: '',
          notes: '',
          entryDate: new Date().toISOString().split('T')[0],
        });
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
    } finally {
      setSubmitting(false);
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
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Manual Tracker</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
              <h2 className="text-xl font-bold">Log Progress</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal (Optional)</label>
                <select
                  value={entry.goalId}
                  onChange={(e) => setEntry({ ...entry, goalId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                >
                  <option value="">Select a goal</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>{goal.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform (Optional)</label>
                <select
                  value={entry.platformId}
                  onChange={(e) => setEntry({ ...entry, platformId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                >
                  <option value="">Select a platform</option>
                  {platforms.map(platform => (
                    <option key={platform.id} value={platform.platformId}>
                      {platform.platform?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value *</label>
                <input
                  type="number"
                  value={entry.value}
                  onChange={(e) => setEntry({ ...entry, value: e.target.value })}
                  placeholder="e.g., 5 problems, 10 commits"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={entry.entryDate}
                  onChange={(e) => setEntry({ ...entry, entryDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={entry.notes}
                  onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
                  rows={3}
                  placeholder="Add any notes about your progress..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Logging Progress...' : 'Log Progress'}
              </button>
            </form>
          </div>

          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Recent Entries</h2>
              {recentEntries.length === 0 ? (
                <p className="text-gray-400 text-sm">No recent entries</p>
              ) : (
                <div className="space-y-3">
                  {recentEntries.slice(0, 10).map(entry => (
                    <div key={entry.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 text-sm">{entry.value} units</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(entry.entryDate).toLocaleDateString()}
                      </div>
                      {entry.notes && (
                        <div className="text-xs text-gray-600 mt-1">{entry.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
