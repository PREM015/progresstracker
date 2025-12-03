// src/components/export/FormatSelector.tsx

'use client';

import React from 'react';
import { FileText, FileJson, FileCode } from 'lucide-react';
import type { ExportFormat } from '@/types/export';

interface FormatSelectorProps {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
}

const formats = [
  {
    value: 'csv' as ExportFormat,
    label: 'CSV',
    description: 'Spreadsheet format',
    icon: FileText,
  },
  {
    value: 'json' as ExportFormat,
    label: 'JSON',
    description: 'Data interchange',
    icon: FileJson,
  },
  {
    value: 'pdf' as ExportFormat,
    label: 'PDF',
    description: 'Formatted report',
    icon: FileCode,
  },
];

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {formats.map((format) => {
        const Icon = format.icon;
        return (
          <button
            key={format.value}
            onClick={() => onChange(format.value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
              value === format.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Icon className="h-6 w-6" />
            <div className="text-center">
              <p className="font-medium text-sm">{format.label}</p>
              <p className="text-xs text-muted-foreground">{format.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}