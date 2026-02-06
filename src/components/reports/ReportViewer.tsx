'use client';

import React, { useState, useEffect } from 'react';

interface Report {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
  size: string;
}

interface ReportViewerProps {
  reportId?: string;
  className?: string;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  reportId,
  className = '',
}) => {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (reportId) {
      fetch(`/api/reports/${reportId}`)
        .then(r => r.json())
        .then(data => setReport(data));
    }
  }, [reportId]);

  if (!report) {
    return <div className="bg-gray-100 rounded-xl p-12 text-center text-gray-500">
      Select a report to view
    </div>;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{report.title}</h3>
          <p className="text-sm text-gray-600">Generated {new Date(report.generatedAt).toLocaleString()}</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          📥 Download
        </button>
      </div>

      <div className="border-t pt-6">
        <div className="prose max-w-none">
          <p className="text-gray-700">Report content would be rendered here...</p>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;
