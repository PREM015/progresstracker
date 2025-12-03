// src/components/export/ExportModal.tsx

'use client';

import React, { useState } from 'react';
import { Download, Loader2, FileText, FileJson, FileCode } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { DateRangeExport } from './DateRangeExport';
import { FormatSelector } from './FormatSelector';
import { useToast } from '@/hooks/useToast';
import type { ExportFormat } from '@/types/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { showToast } = useToast();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState({
    includeGoals: true,
    includeAchievements: true,
    includePlatforms: true,
    includeStats: true,
  });

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const endpoint = `/api/export/${format}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `export.${format}`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Export completed successfully', 'success');
      onClose();
    } catch (error) {
      showToast('Failed to export data', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Your Data">
      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">Export Format</label>
          <FormatSelector value={format} onChange={setFormat} />
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium mb-3">Date Range</label>
          <DateRangeExport
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>

        {/* Include Options */}
        <div>
          <label className="block text-sm font-medium mb-3">Include in Export</label>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={options.includeGoals}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeGoals: !!checked }))
                }
              />
              <span className="text-sm">Goals & Progress</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={options.includeAchievements}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeAchievements: !!checked }))
                }
              />
              <span className="text-sm">Achievements</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={options.includePlatforms}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includePlatforms: !!checked }))
                }
              />
              <span className="text-sm">Platform Connections</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={options.includeStats}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, includeStats: !!checked }))
                }
              />
              <span className="text-sm">Statistics Summary</span>
            </label>
          </div>
        </div>

        {/* Info */}
        <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
          {format === 'csv' && (
            <p>CSV format is best for importing into spreadsheet applications like Excel.</p>
          )}
          {format === 'json' && (
            <p>JSON format includes all data and metadata, ideal for backups and data portability.</p>
          )}
          {format === 'pdf' && (
            <p>PDF format generates a formatted report perfect for printing or sharing.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}