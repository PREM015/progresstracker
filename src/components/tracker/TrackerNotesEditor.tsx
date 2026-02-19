'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTracker } from '@/hooks/useTracker';

interface TrackerNotesEditorProps {
    entryId: string;
    initialNotes?: string;
    onSave?: (notes: string) => void;
    autoSave?: boolean;
    autoSaveDelay?: number;
    className?: string;
}

export function TrackerNotesEditor({
    entryId,
    initialNotes = '',
    onSave,
    autoSave = true,
    autoSaveDelay = 2000,
    className = '',
}: TrackerNotesEditorProps) {
    const { updateEntry } = useTracker();
    const [notes, setNotes] = useState(initialNotes);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setNotes(initialNotes);
    }, [initialNotes]);

    const saveNotes = useCallback(async (content: string) => {
        setIsSaving(true);
        setError(null);

        try {
            await updateEntry(entryId, { notes: content });
            setLastSaved(new Date());
            if (onSave) onSave(content);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    }, [entryId, onSave]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setNotes(newValue);

        if (autoSave) {
            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set new timeout for auto-save
            saveTimeoutRef.current = setTimeout(() => {
                saveNotes(newValue);
            }, autoSaveDelay);
        }
    };

    const handleManualSave = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveNotes(notes);
    };

    const getSaveStatus = () => {
        if (isSaving) return '💾 Saving...';
        if (error) return `❌ ${error}`;
        if (lastSaved) {
            const secondsAgo = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
            if (secondsAgo < 60) return `✅ Saved ${secondsAgo}s ago`;
            const minutesAgo = Math.floor(secondsAgo / 60);
            return `✅ Saved ${minutesAgo}m ago`;
        }
        return '';
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    Notes
                </label>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{getSaveStatus()}</span>
                    {!autoSave && (
                        <button
                            onClick={handleManualSave}
                            disabled={isSaving}
                            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save
                        </button>
                    )}
                </div>
            </div>

            <textarea
                value={notes}
                onChange={handleChange}
                placeholder="Add notes about your progress, challenges, learnings, or anything else..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-shadow"
            />

            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{notes.length} / 5000 characters</span>
                {autoSave && (
                    <span className="text-gray-400">Auto-save enabled</span>
                )}
            </div>

            {/* Formatting Tips */}
            <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">Formatting tips</summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1">
                    <div>• Use <b>**bold**</b> for emphasis</div>
                    <div>• Use <i>*italic*</i> for subtle emphasis</div>
                    <div>• Use bullet points with - or *</div>
                    <div>• Press Ctrl/Cmd + Enter to save manually</div>
                </div>
            </details>
        </div>
    );
}

export default TrackerNotesEditor;
