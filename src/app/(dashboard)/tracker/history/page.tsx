"use client";

import { useState, useEffect } from "react";

export default function TrackerHistoryPage() {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/tracker?limit=50')
            .then(r => r.json())
            .then(data => setHistory(data.entries || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Tracker History</h1>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {history.length === 0 ? (
                        <div className="text-center py-16">
                            <span className="text-5xl">📝</span>
                            <p className="mt-4 text-gray-500">No entries yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {history.map((entry: any) => (
                                <div key={entry.id} className="p-6 hover:bg-gray-50 transition">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{entry.title}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                                            <p className="text-xs text-gray-400 mt-2">{new Date(entry.createdAt).toLocaleString()}</p>
                                        </div>
                                        <span className="text-sm font-medium text-indigo-600">+{entry.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
