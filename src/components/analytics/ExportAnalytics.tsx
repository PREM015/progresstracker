'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExportAnalyticsProps {
  className?: string;
}

export const ExportAnalytics: React.FC<ExportAnalyticsProps> = ({
  className = '',
}) => {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/analytics/export?format=${format}`);
      if (!res.ok) {
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${Date.now()}.${format}`;
      a.click();
      setOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Analytics</DialogTitle>
          <DialogDescription>
            Choose a format to download your analytics report.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
          <div className="space-y-2">
            {(['pdf', 'csv', 'json'] as const).map((fmt) => (
              <label key={fmt} className={cn(
                "flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors",
                format === fmt ? "border-green-600 bg-green-50" : "border-gray-200"
              )}>
                <input
                  type="radio"
                  name="format"
                  value={fmt}
                  checked={format === fmt}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500"
                />
                <div>
                  <div className="font-medium text-gray-900 uppercase">{fmt}</div>
                  <div className="text-xs text-gray-600">
                    {fmt === 'pdf' && 'Full report with charts'}
                    {fmt === 'csv' && 'Spreadsheet data'}
                    {fmt === 'json' && 'Raw data'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="bg-green-600 hover:bg-green-700">
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportAnalytics;

