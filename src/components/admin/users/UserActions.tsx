'use client';

import { useState } from 'react';

interface UserActionsProps {
    userId: string;
    userStatus: string;
    userEmail: string;
    onSuccess?: () => void;
}

export function UserActions({ userId, userStatus, userEmail, onSuccess }: UserActionsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState<string | null>(null);

    const handleAction = async (action: string) => {
        setIsLoading(true);

        try {
            const res = await fetch(`/api/admin/users/${userId}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            if (!res.ok) throw new Error('Action failed');

            if (onSuccess) onSuccess();
            setShowConfirm(null);
        } catch (error) {
            console.error('Action failed:', error);
            alert('Action failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const actions = [
        { id: 'suspend', label: 'Suspend User', color: 'yellow', confirmMessage: 'Suspend this user?' },
        { id: 'activate', label: 'Activate User', color: 'green', confirmMessage: 'Activate this user?' },
        { id: 'ban', label: 'Ban User', color: 'red', confirmMessage: 'Permanently ban this user?' },
        { id: 'reset-password', label: 'Reset Password', color: 'blue', confirmMessage: 'Send password reset email?' },
        { id: 'verify-email', label: 'Verify Email', color: 'indigo', confirmMessage: 'Manually verify email?' },
        { id: 'clear-sessions', label: 'Clear Sessions', color: 'orange', confirmMessage: 'Log user out of all devices?' },
    ];

    return (
        <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Quick Actions</h4>

            <div className="grid grid-cols-2 gap-2">
                {actions.map(action => {
                    const colorMap: Record<string, string> = {
                        yellow: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50',
                        green: 'border-green-300 text-green-700 hover:bg-green-50',
                        red: 'border-red-300 text-red-700 hover:bg-red-50',
                        blue: 'border-blue-300 text-blue-700 hover:bg-blue-50',
                        indigo: 'border-indigo-300 text-indigo-700 hover:bg-indigo-50',
                        orange: 'border-orange-300 text-orange-700 hover:bg-orange-50',
                    };

                    return (
                        <button
                            key={action.id}
                            onClick={() => setShowConfirm(action.id)}
                            disabled={isLoading}
                            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${colorMap[action.color]}`}
                        >
                            {action.label}
                        </button>
                    );
                })}
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Action</h3>
                        <p className="text-gray-600 mb-6">
                            {actions.find(a => a.id === showConfirm)?.confirmMessage}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction(showConfirm)}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isLoading ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserActions;
