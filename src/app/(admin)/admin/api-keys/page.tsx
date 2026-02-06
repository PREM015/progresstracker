"use client";

import { useState, useEffect } from "react";

export default function AdminApiKeysPage() {
    const [keys, setKeys] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/admin/api-keys')
            .then(r => r.json())
            .then(data => setKeys(data.keys || []))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">🔑 API Keys Management</h1>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {keys.map((key: any) => (
                                <tr key={key.id}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{key.userId}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{key.key}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <button className="text-red-600 hover:text-red-700">Revoke</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
