"use client";

import { useState } from "react";

export default function AdminImpersonationPage() {
    const [userId, setUserId] = useState("");

    const handleImpersonate = async () => {
        if (!userId) return;
        // Impersonation logic
        alert(`Impersonating user ${userId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">👤 User Impersonation</h1>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h3 className="font-bold text-yellow-900">Warning</h3>
                            <p className="text-yellow-800 text-sm">This action will log you in as another user. Use with caution.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Enter user ID"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg mb-4"
                    />
                    <button
                        onClick={handleImpersonate}
                        className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                        Start Impersonation
                    </button>
                </div>
            </div>
        </div>
    );
}
