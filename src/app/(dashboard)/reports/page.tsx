"use client";

import { useState, useEffect } from "react";
import ReportsList from "@/components/reports/ReportsList";
import CustomReport from "@/components/reports/CustomReport";
import WeeklyReport from "@/components/reports/WeeklyReport";
import MonthlyReport from "@/components/reports/MonthlyReport";
import ScheduledReports from "@/components/reports/ScheduledReports";

export default function ReportsPage() {
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportsData, setReportsData] = useState<any>(null);

  useEffect(() => {
    // Fetch reports data
    fetch('/api/reports')
      .then(r => r.json())
      .then(data => setReportsData(data))
      .catch(err => console.error('Failed to fetch reports:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Reports</h1>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Custom Report
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {showCustom && <CustomReport onGenerate={async () => { }} />}
            {reportsData?.weeklyReport && <WeeklyReport data={reportsData.weeklyReport} />}
            {reportsData?.monthlyReport && <MonthlyReport data={reportsData.monthlyReport} />}
            <ReportsList />
          </div>

          <div className="space-y-6">
            <ScheduledReports />
          </div>
        </div>
      </div>
    </div>
  );
}
