'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';
import { TrackerEntry } from '@/types/tracker';
import { format } from 'date-fns';

interface ExportButtonProps {
  entries: TrackerEntry[];
  dateRange: { start: Date; end: Date };
}

export function ExportButton({ entries, dateRange }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportAsCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Date', 'Platform', 'Problems', 'Time (hrs)', 'Notes'];
      const rows = entries.map((entry) => [
        format(new Date(entry.date), 'yyyy-MM-dd'),
        entry.platform || '',
        entry.problems || 0,
        ((entry.timeSpent || 0) / 60).toFixed(2),
        entry.notes || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracker_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsJSON = () => {
    setIsExporting(true);
    try {
      const jsonContent = JSON.stringify(
        {
          exportDate: new Date().toISOString(),
          dateRange: {
            start: dateRange.start.toISOString(),
            end: dateRange.end.toISOString(),
          },
          entries,
        },
        null,
        2
      );

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracker_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('JSON export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dropdown
      trigger={
        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          isLoading={isExporting}
        >
          Export
        </Button>
      }
    >
      <div className="py-1">
        <button
          onClick={exportAsCSV}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export as CSV
        </button>
        <button
          onClick={exportAsJSON}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FileJson className="w-4 h-4" />
          Export as JSON
        </button>
      </div>
    </Dropdown>
  );
}