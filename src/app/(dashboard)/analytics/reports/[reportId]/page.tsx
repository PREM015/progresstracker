"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function ReportDetailPage() {
    const params = useParams();
    const reportId = params.reportId as string;

    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/analytics/reports/${reportId}`)
            .then(r => r.json())
            .then(data => setReport(data.report))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [reportId]);

    const downloadReport = async (format: string) => {
        const res = await fetch(`/api/analytics/reports/${reportId}/export?format=${format}`);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.${format.toLowerCase()}`;
        a.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <span className="text-5xl">📊</span>
                    <p className="mt-4 text-gray-500">Report not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold">{report.title}</h1>
                        <p className="text-gray-600 mt-2">Generated on {new Date(report.generatedAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => downloadReport('PDF')}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Download PDF
                        </button>
                        <button
                            onClick={() => downloadReport('CSV')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                            Download CSV
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    {report.summary && Object.entries(report.summary).map(([key, value]) => (
                        <div key={key} className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="text-sm text-gray-600 capitalize mb-1">{key.replace(/_/g, ' ')}</div>
                            <div className="text-3xl font-bold text-indigo-600">{String(value)}</div>
                        </div>
                    ))}
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-8">
                    <h2 className="text-2xl font-bold mb-6">Report Data</h2>
                    {report.data ? (
                        <div className="overflow-x-auto">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                                {JSON.stringify(report.data, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <p className="text-gray-500">No data available</p>
                    )}
                </div>
            </div>
        </div>
    );
}
