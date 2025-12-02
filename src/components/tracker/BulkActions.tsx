"use client";

import { useState } from 'react';
import  Button  from '@/components/ui/Button';
import { Trash2, X } from 'lucide-react';
import  Alert  from '@/components/ui/Alert';

interface BulkActionsProps {
  selectedCount: number;
  onDelete: () => Promise<void>;
  onCancel: () => void;
}

export function BulkActions({ selectedCount, onDelete, onCancel }: BulkActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setShowConfirm(false);
      onCancel();
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mb-4">
      {showConfirm ? (
        <Alert variant="warning">
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              Are you sure you want to delete {selectedCount} entries?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Confirm Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Alert>
      ) : (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'} selected
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={() => setShowConfirm(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              leftIcon={<X className="w-4 h-4" />}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}