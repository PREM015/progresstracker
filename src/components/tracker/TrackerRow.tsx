'use client';

import { useState } from 'react';
import  Button  from '@/components/ui/Button';
import { Trash2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { TrackerEntry } from '@/types/tracker';

interface TrackerRowProps {
  entry: TrackerEntry;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, data: Partial<TrackerEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TrackerRow({
  entry,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: TrackerRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    platformId: entry.platformId || '',
    problemsSolved: entry.problemsSolved || 0,
    timeSpent: entry.timeSpent || 0,
    notes: entry.notes || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdate(entry.id, editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      platformId: entry.platformId || '',
      problemsSolved: entry.problemsSolved || 0,
      timeSpent: entry.timeSpent || 0,
      notes: entry.notes || '',
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this entry?')) {
      setIsLoading(true);
      try {
        await onDelete(entry.id);
      } catch (error) {
        console.error('Failed to delete entry:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <tr
      className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(entry.id)}
          className="rounded"
        />
      </td>
      <td className="px-4 py-3 text-sm">
        {format(new Date(entry.date), 'MMM dd, yyyy')}
      </td>
      <td className="px-4 py-3 text-sm">
        {isEditing ? (
          <input
            type="text"
            value={editData.platformId}
            onChange={(e) =>
              setEditData({ ...editData, platformId: e.target.value })
            }
            className="w-full px-2 py-1 border rounded"
          />
        ) : (
          entry.platformId || '-'
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {isEditing ? (
          <input
            type="number"
            value={editData.problemsSolved}
            onChange={(e) =>
              setEditData({ ...editData, problemsSolved: parseInt(e.target.value) || 0 })
            }
            className="w-20 px-2 py-1 border rounded"
            min="0"
          />
        ) : (
          entry.problemsSolved || 0
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {isEditing ? (
          <input
            type="number"
            value={editData.timeSpent}
            onChange={(e) =>
              setEditData({ ...editData, timeSpent: parseInt(e.target.value) || 0 })
            }
            className="w-20 px-2 py-1 border rounded"
            min="0"
            step="0.5"
          />
        ) : (
          `${(entry.timeSpent || 0) / 60} hrs`
        )}
      </td>
      <td className="px-4 py-3 text-sm max-w-xs truncate">
        {isEditing ? (
          <textarea
            value={editData.notes}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            className="w-full px-2 py-1 border rounded"
            rows={2}
          />
        ) : (
          entry.notes || '-'
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {isEditing ? (
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              onClick={handleSave}
              isLoading={isLoading}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              leftIcon={<X className="w-4 h-4" />}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleDelete}
              isLoading={isLoading}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}