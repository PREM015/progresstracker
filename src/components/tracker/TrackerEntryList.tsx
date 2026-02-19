'use client';

import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntry } from '@/types/tracker';

interface TrackerEntryListProps {
  className?: string;
}

export const TrackerEntryList: React.FC<TrackerEntryListProps> = ({
  className = '',
}) => {
  const { entries, isLoading } = useTracker();

  if (isLoading) return <div className="h-96 bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse" />;

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">All Entries</h3>

      <div className="space-y-3">
        {entries.map((entry: TrackerEntry) => (
          <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <div>
              <div className="font-semibold">{entry.notes || 'Untitled Entry'}</div>
              <div className="text-sm text-gray-600 dark:text-zinc-400">{entry.platform?.name || 'Manual'} • {new Date(entry.date).toLocaleDateString()}</div>
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{entry.problemsSolved}</div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">📝</span>
            No entries yet
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackerEntryList;
