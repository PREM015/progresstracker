'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface NotesCellProps {
  notes?: string;
  isEditing?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export function NotesCell({
  notes,
  isEditing = false,
  value = '',
  onChange,
}: NotesCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isEditing) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
        rows={3}
        placeholder="Add notes..."
      />
    );
  }

  if (!notes) {
    return <span className="text-gray-400">-</span>;
  }

  const truncatedNotes = notes.length > 50 ? notes.substring(0, 50) + '...' : notes;

  return (
    <div>
      <p className="text-sm">{isExpanded ? notes : truncatedNotes}</p>
      {notes.length > 50 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1 hover:underline"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}