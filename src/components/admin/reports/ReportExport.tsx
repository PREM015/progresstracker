'use client';

export function ReportExport({ reportType }: { reportType: string }) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async (format: 'csv' | 'pdf' | 'json') => {
        setExporting(true);
        try {
            const res = await fetch(`/api/admin/reports/export?type=${reportType}&format=${format}`);
            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportType}-report-${Date.now()}.${format}`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Export Report</h3>
            <div className="flex gap-3">
                <button
                    onClick={() => handleExport('csv')}
                    disabled={exporting}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                >
                    Export CSV
                </button>
                <button
                    onClick={() => handleExport('pdf')}
                    disabled={exporting}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                >
                    Export PDF
                </button>
                <button
                    onClick={() => handleExport('json')}
                    disabled={exporting}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                >
                    Export JSON
                </button>
            </div>
        </div>
    );
}

import { useState } from 'react';

export default ReportExport;
