'use client';

import { useState, useEffect } from 'react';

export function ReportsList() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/admin/reports');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setReports(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Loading reports...</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white">Generated Reports</h3>
            </div>

            <table className="w-full">
                <thead>
                    <tr className="border-b border-zinc-800">
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Report Name</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Type</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Generated</th>
                        <th className="text-left p-4 text-sm font-medium text-zinc-400">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((report) => (
                        <tr key={report.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                            <td className="p-4 text-white">{report.name}</td>
                            <td className="p-4 text-zinc-400">{report.type}</td>
                            <td className="p-4 text-zinc-400 text-sm">
                                {new Date(report.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                                <div className="flex gap-2">
                                    <a
                                        href={`/admin/reports/${report.id}`}
                                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
                                    >
                                        View
                                    </a>
                                    <button className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm">
                                        Download
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {reports.length === 0 && (
                <div className="p-8 text-center text-zinc-500">No reports generated yet</div>
            )}
        </div>
    );
}

export default ReportsList;
