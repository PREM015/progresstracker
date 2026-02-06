'use client';

import React, { useState, useEffect } from 'react';

interface Report {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}

interface ReportsListProps {
  className?: string;
}

export const ReportsList: React.FC<ReportsListProps> = ({
  className = '',
}) => {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(data => setReports(data));
  }, []);

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">My Reports</h3>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          + New Report
        </button>
      </div>

      <div className="space-y-3">
        {reports.map(report => (
          <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <div>
              <div className="font-semibold">{report.title}</div>
              <div className="text-sm text-gray-600">{report.type} • {new Date(report.createdAt).toLocaleDateString()}</div>
            </div>
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-100">View</button>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <span className="text-5xl mb-4 block">📊</span>
            No reports generated yet
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsList;
