'use client';

import { useState } from 'react';

export function ReportGenerator() {
    const [reportType, setReportType] = useState('users');
    const [generating, setGenerating] = useState(false);
    const [report, setReport] = useState<any>(null);

    const generateReport = async () => {
        setGenerating(true);
        try {
            const res = await fetch(`/api/admin/reports/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: reportType }),
            });
            if (!res.ok) throw new Error('Failed to generate');
            const data = await res.json();
            setReport(data);
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Generate Custom Report</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white"
                        >
                            <option value="users">User Activity Report</option>
                            <option value="platforms">Platform Usage Report</option>
                            <option value="goals">Goals & Progress Report</option>
                            <option value="revenue">Revenue Report</option>
                            <option value="engagement">Engagement Report</option>
                        </select>
                    </div>

                    <button
                        onClick={generateReport}
                        disabled={generating}
                        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            {report && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h4 className="text-white font-semibold mb-4">Report Results</h4>
                    <pre className="text-zinc-400 text-sm bg-zinc-950 p-4 rounded overflow-auto max-h-96">
                        {JSON.stringify(report, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default ReportGenerator;
