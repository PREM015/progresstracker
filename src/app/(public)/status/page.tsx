"use client";

import { useState, useEffect } from "react";

export default function StatusPage() {
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        fetch('/api/status')
            .then(r => r.json())
            .then(data => setStatus(data))
            .catch(() => setStatus({ status: 'operational' }));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">System Status</h1>
                <p className="text-gray-600 mb-8">Current status of all systems</p>

                <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-2xl font-bold text-green-600">All Systems Operational</span>
                    </div>
                </div>

                <div className="space-y-4">
                    {['API', 'Database', 'Auth Service', 'Analytics', 'Sync Service'].map(service => (
                        <div key={service} className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between">
                            <span className="font-medium text-gray-900">{service}</span>
                            <span className="flex items-center gap-2 text-green-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Operational
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
