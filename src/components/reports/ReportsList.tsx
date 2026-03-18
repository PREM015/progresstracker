'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Report {
  id: string;
  title: string;
  type: string;
  pdfUrl?: string;
  createdAt: string;
}

interface ReportsListProps {
  className?: string;
}

export const ReportsList: React.FC<ReportsListProps> = ({
  className = '',
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then(async r => {
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`Failed to fetch reports: ${r.status} ${r.statusText} - ${text}`);
        }
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setReports(data);
        } else if (data.success && Array.isArray(data.data?.reports)) {
          setReports(data.data.reports);
        } else if (data.success && Array.isArray(data.data?.data)) {
          // Handle paginated format where reports might be in data.data
          setReports(data.data.data);
        } else if (data.data?.exports) {
          // Handle export job format if mixed up
          setReports(data.data.exports);
        } else {
          console.warn('Unexpected reports data format:', data);
          setReports([]);
        }
      })
      .catch(err => {
        console.error('Error loading reports:', err);
        setReports([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden ${className}`}>
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reports</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage and download your generated reports.</p>
        </div>
        <Button size="sm" className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
          Generate Report
        </Button>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="text-sm font-medium">Loading reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-900/50">
            <FileText className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">No reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {reports.map((report, index) => (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                key={report.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {report.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                      <span className="capitalize">{report.type}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {report.pdfUrl ? (
                  <a href={report.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                    <Download className="w-4 h-4" />
                    <span className="sr-only">Download</span>
                  </a>
                ) : (
                  <a href={`/api/reports/download/${report.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                    <Download className="w-4 h-4" />
                    <span className="sr-only">Download</span>
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsList;
