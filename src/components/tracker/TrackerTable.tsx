'use client';

import { useState } from 'react';
import { TrackerRow } from './TrackerRow';
import { BulkActions } from './BulkActions';
import  Button  from '@/components/ui/Button';
import  Spinner  from '@/components/ui/Spinner';
import  Alert  from '@/components/ui/Alert';
import { Plus } from 'lucide-react';
import { TrackerEntry } from '@/types/tracker';

interface TrackerTableProps {
  entries: TrackerEntry[];
  isLoading: boolean;
  onUpdate: (id: string, data: Partial<TrackerEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onAddNew: () => void;
}

export function TrackerTable({
  entries,
  isLoading,
  onUpdate,
  onDelete,
  onBulkDelete,
  onAddNew,
}: TrackerTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = () => {
    if (selectedIds.length === entries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(entries.map((e) => e.id));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Alert variant="info">
          <p className="text-lg mb-4">No entries found for this date range.</p>
          <Button onClick={onAddNew} leftIcon={<Plus />}>
            Add First Entry
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      {selectedIds.length > 0 && (
        <BulkActions
          selectedCount={selectedIds.length}
          onDelete={() => onBulkDelete(selectedIds)}
          onCancel={() => setSelectedIds([])}
        />
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.length === entries.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Platform</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Problems</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Time (hrs)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Notes</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <TrackerRow
                key={entry.id}
                entry={entry}
                isSelected={selectedIds.includes(entry.id)}
                onSelect={handleSelect}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}