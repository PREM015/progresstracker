'use client';

import { useState } from 'react';

interface TrackerValidationFormProps {
    entryId: string;
    onValidate: (validated: boolean, notes?: string) => void;
    className?: string;
}

export function TrackerValidationForm({ entryId, onValidate, className = '' }: TrackerValidationFormProps) {
    const [validationNotes, setValidationNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleValidate = async (isValid: boolean) => {
        setIsSubmitting(true);

        try {
            await fetch(`/api/tracker/${entryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isVerified: isValid,
                    notes: validationNotes || undefined,
                }),
            });

            onValidate(isValid, validationNotes);
        } catch (error) {
            console.error('Failed to validate entry:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
            <h3 className="font-semibold text-gray-900 mb-4">Verify Entry</h3>

            <textarea
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                placeholder="Add verification notes (optional)..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none mb-4"
            />

            <div className="flex gap-3">
                <button
                    onClick={() => handleValidate(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    Mark Invalid
                </button>
                <button
                    onClick={() => handleValidate(true)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    Verify Entry
                </button>
            </div>
        </div>
    );
}

export default TrackerValidationForm;
