"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function TrackerDetailPage() {
  const params = useParams();
  const trackerId = params.id as string;

  const [tracker, setTracker] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tracker/${trackerId}`)
      .then(r => r.json())
      .then(data => setTracker(data.tracker))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [trackerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!tracker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">📊</span>
          <p className="mt-4 text-gray-500">Tracker entry not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Tracker Entry</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Platform</div>
              <div className="text-lg font-bold">{tracker.platform?.name || 'Manual Entry'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Type</div>
              <div className="text-lg font-bold">{tracker.type}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Value</div>
              <div className="text-2xl font-bold text-indigo-600">{tracker.value}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Date</div>
              <div className="text-lg font-bold">
                {new Date(tracker.date).toLocaleDateString()}
              </div>
            </div>
          </div>

          {tracker.notes && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700">{tracker.notes}</p>
            </div>
          )}

          {tracker.metadata && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">Metadata</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(tracker.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
