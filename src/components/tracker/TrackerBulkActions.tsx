'use client';

import React, { useState } from 'react';
import { useTracker } from '@/hooks/useTracker';

interface TrackerBulkActionsProps {
  selectedIds: string[];
  onDelete?: () => void;
  onExport?: () => void;
  className?: string;
}

export const TrackerBulkActions: React.FC<TrackerBulkActionsProps> = ({
  selectedIds,
  onDelete,
  onExport,
  className = '',
}) => {
  const { bulkDelete } = useTracker();
  const [isDeleting, setIsDeleting] = useState(false);
  if (selectedIds.length === 0) return null;

  return (
    <div className={`bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between ${className}`}>
      <span className="font-medium text-indigo-900">
        {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
      </span>

      <div className="flex gap-3">
        <button
          onClick={onExport}
          className="px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50"
        >
          📥 Export
        </button>
        <button
          onClick={async () => {
            if (onDelete) {
              onDelete();
            } else {
              setIsDeleting(true);
              try {
                await bulkDelete(selectedIds);
              } finally {
                setIsDeleting(false);
              }
            }
          }}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? '...' : '🗑️ Delete'}
        </button>
      </div>
    </div>
  );
};

export default TrackerBulkActions;
