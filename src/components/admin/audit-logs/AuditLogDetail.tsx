'use client';

import { useState, useEffect } from 'react';

export function AuditLogDetail({ logId }: { logId: string }) {
    const [log, setLog] = useState<any>(null);

    useEffect(() => {
        fetch(`/api/admin/audit-logs/${logId}`)
            .then(res => res.json())
            .then(d => setLog(d));
    }, [logId]);

    if (!log) return <div>Loading...</div>;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">{log.action}</h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-zinc-500">Category:</span>
                    <span className="text-white">{log.category}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">User:</span>
                    <span className="text-white">{log.user?.email || 'System'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">IP Address:</span>
                    <span className="text-white font-mono">{log.ipAddress}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">Timestamp:</span>
                    <span className="text-white">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.description && (
                    <div>
                        <span className="text-zinc-500">Description:</span>
                        <p className="text-white mt-1">{log.description}</p>
                    </div>
                )}
                {log.metadata && (
                    <div>
                        <span className="text-zinc-500">Metadata:</span>
                        <pre className="text-white mt-1 bg-zinc-950 p-3 rounded overflow-auto text-xs">
                            {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AuditLogDetail;
