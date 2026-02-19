'use client';

import React, { useState } from 'react';

interface ReportGeneratorProps {
  userId: string;
  className?: string;
}

import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { FileBarChart, Calendar, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  userId,
  className = '',
}) => {
  const [reportType, setReportType] = useState('progress');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // ... existing logic ...
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: reportType, dateRange }),
      });

      if (!res.ok) throw new Error('Report generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportType}_${Date.now()}.pdf`;
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <GlassCard className={`p-8 ${className} relative overflow-hidden group border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50`}>
      <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 blur-[100px] rounded-full -mr-16 -mt-16 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <FileBarChart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Generate Report</h3>
            <p className="text-sm text-zinc-500 dark:text-indigo-200/60">customize and download your performance data</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-zinc-500 dark:text-indigo-200/70 uppercase tracking-wider">Report Type</Label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all hover:bg-zinc-50 dark:hover:bg-white/10"
              >
                <option value="progress" className="bg-white dark:bg-zinc-900">Progress Report</option>
                <option value="analytics" className="bg-white dark:bg-zinc-900">Analytics Summary</option>
                <option value="achievements" className="bg-white dark:bg-zinc-900">Achievements Report</option>
                <option value="goals" className="bg-white dark:bg-zinc-900">Goals Summary</option>
                <option value="platforms" className="bg-white dark:bg-zinc-900">Platform Activity</option>
              </select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-zinc-500 dark:text-indigo-200/70 uppercase tracking-wider">Date Range</Label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-4 py-3.5 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all hover:bg-zinc-50 dark:hover:bg-white/10"
              >
                <option value="last_7_days" className="bg-white dark:bg-zinc-900">Last 7 Days</option>
                <option value="last_30_days" className="bg-white dark:bg-zinc-900">Last 30 Days</option>
                <option value="last_90_days" className="bg-white dark:bg-zinc-900">Last 90 Days</option>
                <option value="this_year" className="bg-white dark:bg-zinc-900">This Year</option>
                <option value="all_time" className="bg-white dark:bg-zinc-900">All Time</option>
              </select>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-white/5 rounded-2xl p-6">
            <h4 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center gap-2.5 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 box-shadow-indigo" />
              Report Contents
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Detailed statistics and metrics',
                'Charts and visualizations',
                'Progress over time',
                'Platform breakdown'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-7 bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 text-lg font-medium rounded-xl transition-all hover:shadow-indigo-600/30 active:scale-[0.99]"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating Report...
              </span>
            ) : (
              <span className="flex items-center gap-2.5">
                <Download className="w-5 h-5" />
                Generate & Download Report
              </span>
            )}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
};

export default ReportGenerator;
