/**
 * ============================================================================
 * API KEY FORM COMPONENT
 * ============================================================================
 * UI Component that provides an input form for users to generate new API keys.
 * Handles loading states, validation errors, and delegates creation upstream.
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

/**
 * Props for the ApiKeyForm Component
 */
interface ApiKeyFormProps {
    // Callback injected by parent to push the data to the API
    onCreate: (name: string) => Promise<void>;
    // Callback injected by parent to close or discard the form
    onCancel: () => void;
}

export const ApiKeyForm = ({ onCreate, onCancel }: ApiKeyFormProps) => {
    // State for tracking the API key alias inputted by the user
    const [name, setName] = useState('');

    // State to track if an async request to create the key is ongoing
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State to persist validation or API errors on submission
    const [error, setError] = useState<string | null>(null);

    /**
     * Orchestrator function triggered upon form submission
     * Pre-validates the name, delegates creation, handles final states.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = name.trim();
        // Do not submit empty strings
        if (!trimmedName) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // Defer API calling responsibilities to the parent's onCreate prop
            await onCreate(trimmedName);

            // Successfully created key; clear local form state
            setName('');
        } catch (err: any) {
            // Surface any errors up to the user
            setError(err.message || 'Failed to create API key');
        } finally {
            // Regardless of failure/success, cancel the loading spinner
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New API Key</h3>
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Error Banner displayed if an exception throws */}
                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Name Input Field */}
                <div className="space-y-2">
                    <Label htmlFor="keyName">Key Identifier Name</Label>
                    <Input
                        id="keyName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Development Key, Production V2"
                        disabled={isSubmitting}
                        required
                        autoFocus
                    />
                    <p className="text-xs text-gray-500">
                        A memorable name to help you identify this key later.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={!name.trim() || isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isSubmitting ? 'Generating Secure Key...' : 'Create Secret Key'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
