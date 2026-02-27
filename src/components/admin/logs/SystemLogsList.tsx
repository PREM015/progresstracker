'use client';
import { useState, useEffect } from 'react';
import { useAdminSystemLogs } from '@/hooks/useAdminLogs';

export function SystemLogsList() {
    const { logs, isLoading: loading } = useAdminSystemLogs();

    if (loading) return <div className="text-zinc-500 text-center p-8">Loading system logs...</div>;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-zinc-800">
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Time</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Level</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Message</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log, i) => (
                        <tr key={log.id || i} className="border-b border-zinc-800">
                            <td className="p-4 text-zinc-400 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs ${log.level === 'ERROR' ? 'bg-red-500/20 text-red-400' : log.level === 'WARN' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-700 text-zinc-300'}`}>
                                    {log.level}
                                </span>
                            </td>
                            <td className="p-4 text-white font-mono text-sm">{log.message}</td>
                        </tr>
                    ))}
                    {logs.length === 0 && (
                        <tr><td colSpan={3} className="p-8 text-center text-zinc-500">No system logs found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
export default SystemLogsList;
