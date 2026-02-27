/**
 * ============================================================================
 * API KEY LIST COMPONENT
 * ============================================================================
 * Displays a formatted list of all active API Keys for the user.
 * Supports copying the raw key (if newly generated) and revoking existing keys.
 */
'use client';

import { Key, Trash2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

/**
 * Shape of an API Key object
 */
export interface ApiKey {
    id: string;
    name: string;
    key?: string;      // The raw, unhashed key (ONLY returned on the initial creation response)
    prefix?: string;   // The safe prefix used for key masking (e.g. pk_test_***)
    createdAt?: string;
    lastUsedAt?: string | null;
}

/**
 * Props for the ApiKeyList Component
 */
interface ApiKeyListProps {
    keys: ApiKey[];
    onDelete: (id: string) => Promise<void>; // Upstream handler to revoke a key via API
    isLoading: boolean;                      // Loading flag while fetching initial list
}

export const ApiKeyList = ({ keys, onDelete, isLoading }: ApiKeyListProps) => {
    // Track which specific key is currently in the process of being deleted (for loading spinners)
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Track which specific key ID was copied to clipboard (to show a success checkmark)
    const [copiedId, setCopiedId] = useState<string | null>(null);

    /**
     * Helper orchestrates calling the parent's onDelete prop
     * while managing local loading spinners 
     */
    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await onDelete(id);
        } catch (e) {
            console.error('Failed to delete key parameter', e);
        } finally {
            setDeletingId(null);
        }
    };

    /**
     * Cross-browser clipboard copy helper.
     * Modifies state to temporally show a "check" icon before reverting back to "copy".
     */
    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        // Reset copy state after 2 seconds
        setTimeout(() => setCopiedId(null), 2000);
    };

    /**
     * Transforms raw ISO date strings into readable UI dates.
     */
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Never';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(dateStr));
    };

    // Phase 1: Show a loading screen while resolving the parent API fetch
    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Phase 2: Show empty placeholder if no keys exist
    if (keys.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 shadow-sm transition-all hover:shadow-md">
                <Key className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No API Keys Generated</h3>
                <p className="mt-1">You haven't generated any secret API keys yet. Create one to integrate with external tools.</p>
            </div>
        );
    }

    // Phase 3: Render iterations over all keys in descending order
    return (
        <div className="space-y-4">
            {keys.map((apiKey) => (
                <div key={apiKey.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-indigo-100 transition-colors">

                    <div className="space-y-1 flex-1">
                        {/* Key Alias Title */}
                        <h4 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                            <Key className="w-4 h-4 text-indigo-500" />
                            {apiKey.name}
                        </h4>

                        {/* Safe Key Representation area */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2">
                            <code className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md font-mono text-sm border border-gray-200 flex items-center gap-3 w-fit">
                                {/* 
                  If apiKey.key is present, it's newly created—show full key!
                  Else, just show masked prefix and last 4 chars of the ID for identification 
                */}
                                {apiKey.key ? apiKey.key : `${apiKey.prefix || 'pk_test'}...${apiKey.id.slice(-4)}`}

                                {/* Only newly generated Keys can be copied. Once the user leaves the page, it's hidden forever. */}
                                {apiKey.key && (
                                    <button
                                        onClick={() => copyToClipboard(apiKey.key!, apiKey.id)}
                                        className="text-gray-500 hover:text-indigo-600 transition-colors bg-white rounded shadow-sm border p-1"
                                        title="Copy full secret to clipboard"
                                    >
                                        {copiedId === apiKey.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                )}
                            </code>

                            {/* Context Warning for new keys */}
                            {apiKey.key && (
                                <span className="text-xs text-amber-600 font-medium ml-1">
                                    ⚠️ Copy this now. You won't be able to see it again!
                                </span>
                            )}
                        </div>

                        {/* Metadata Footer */}
                        <div className="flexitems-center gap-4 text-xs text-gray-500 mt-4 pt-2 border-t border-gray-50 w-full md:w-fit">
                            <span>Created {formatDate(apiKey.createdAt)}</span>
                            <span className="mx-2 opacity-50">•</span>
                            <span>Last used: {formatDate(apiKey.lastUsedAt || undefined)}</span>
                        </div>
                    </div>

                    {/* Action to Revoke/Delete Key */}
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(apiKey.id)}
                        disabled={deletingId === apiKey.id}
                        className="flex items-center gap-2 hover:bg-red-700 transition"
                    >
                        {deletingId === apiKey.id ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        Revoke Key
                    </Button>

                </div>
            ))}
        </div>
    );
};
