// src/components/export/DateRangeExport.tsx

'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { format } from 'date-fns';

interface DateRangeExportProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

export function DateRangeExport({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeExportProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm mb-2">Start Date</label>
        <div className="relative">
          <Input
            type="date"
            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
            onChange={(e) =>
              onStartDateChange(e.target.value ? new Date(e.target.value) : undefined)
            }
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2">End Date</label>
        <div className="relative">
          <Input
            type="date"
            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            onChange={(e) =>
              onEndDateChange(e.target.value ? new Date(e.target.value) : undefined)
            }
            min={startDate ? format(startDate, 'yyyy-MM-dd') : undefined}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>
  );
}