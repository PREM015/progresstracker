'use client';

import { useState } from 'react';

interface BulkAction {
    id: string;
    label: string;
    description: string;
    requiresConfirmation: boolean;
    dangerLevel: 'safe' | 'warning' | 'danger';
}

interface UserBulkActionsProps {
    selectedUsers: string[];
    onComplete: () => void;
    onClear: () => void;
}

const BULK_ACTIONS: BulkAction[] = [
    {
        id: 'send-email',
        label: 'Send Email',
        description: 'Send a custom email to selected users',
        requiresConfirmation: false,
        dangerLevel: 'safe',
    },
    {
        id: 'activate',
        label: 'Activate',
        description: 'Activate all selected user accounts',
        requiresConfirmation: true,
        dangerLevel: 'safe',
    },
    {
        id: 'suspend',
        label: 'Suspend',
        description: 'Temporarily suspend selected user accounts',
        requiresConfirmation: true,
        dangerLevel: 'warning',
    },
    {
        id: 'verify-emails',
        label: 'Verify Emails',
        description: 'Mark emails as verified',
        requiresConfirmation: true,
        dangerLevel: 'safe',
    },
    {
        id: 'reset-passwords',
        label: 'Reset Passwords',
        description: 'Send password reset emails to all selected users',
        requiresConfirmation: true,
        dangerLevel: 'warning',
    },
    {
        id: 'export',
        label: 'Export Data',
        description: 'Export selected users data as CSV',
        requiresConfirmation: false,
        dangerLevel: 'safe',
    },
    {
        id: 'delete',
        label: 'Delete Accounts',
        description: 'Permanently delete selected user accounts',
        requiresConfirmation: true,
        dangerLevel: 'danger',
    },
];

export function UserBulkActions({ selectedUsers, onComplete, onClear }: UserBulkActionsProps) {
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');

    const handleActionSelect = (actionId: string) => {
        const action = BULK_ACTIONS.find(a => a.id === actionId);
        if (!action) return;

        setSelectedAction(actionId);

        if (action.requiresConfirmation) {
            setShowConfirm(true);
        } else if (actionId === 'send-email') {
            // Show email form
            setShowConfirm(true);
        } else {
            executeBulkAction(actionId);
        }
    };

    const executeBulkAction = async (actionId: string) => {
        setIsProcessing(true);

        try {
            const payload: Record<string, unknown> = {
                action: actionId,
                userIds: selectedUsers,
            };

            if (actionId === 'send-email') {
                payload.subject = emailSubject;
                payload.body = emailBody;
            }

            const res = await fetch('/api/admin/users/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Bulk action failed');

            onComplete();
            setShowConfirm(false);
            setSelectedAction(null);
        } catch (error) {
            console.error('Bulk action failed:', error);
            alert('Bulk action failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (selectedUsers.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
                Select users to perform bulk actions
            </div>
        );
    }

    const currentAction = BULK_ACTIONS.find(a => a.id === selectedAction);

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="font-semibold text-gray-900">Bulk Actions</h4>
                    <p className="text-sm text-gray-500">{selectedUsers.length} users selected</p>
                </div>
                <button
                    onClick={onClear}
                    className="text-sm text-gray-600 hover:text-gray-800"
                >
                    Clear selection
                </button>       </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {BULK_ACTIONS.map(action => {
                    const colorMap = {
                        safe: 'border-blue-300 text-blue-700 hover:bg-blue-50',
                        warning: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50',
                        danger: 'border-red-300 text-red-700 hover:bg-red-50',
                    };

                    return (
                        <button
                            key={action.id}
                            onClick={() => handleActionSelect(action.id)}
                            disabled={isProcessing}
                            className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${colorMap[action.dangerLevel]}`}
                            title={action.description}
                        >
                            {action.label}
                        </button>
                    );
                })}
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && currentAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{currentAction.label}</h3>
                        <p className="text-gray-600 mb-4">{currentAction.description}</p>

                        {selectedAction === 'send-email' && (
                            <div className="space-y-3 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="Email subject..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                        placeholder="Email message..."
                                    />
                                </div>
                            </div>
                        )}

                        <p className="text-sm text-gray-500 mb-6">
                            This will affect <strong>{selectedUsers.length}</strong> users.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirm(false);
                                    setSelectedAction(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => executeBulkAction(selectedAction!)}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserBulkActions;
