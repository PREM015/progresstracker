'use client';

import  Button  from '@/components/ui/Button';
import { Download, Image as ImageIcon } from 'lucide-react';
import { useRef } from 'react';
import html2canvas from 'html2canvas';

interface ExportChartProps {
  chartId: string;
  filename?: string;
}

export function ExportChart({ chartId, filename = 'chart' }: ExportChartProps) {
  const handleExport = async () => {
    const element = document.getElementById(chartId);
    if (!element) {
      console.error(`Element with id "${chartId}" not found`);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to export chart:', error);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleExport}
      leftIcon={<Download className="w-4 h-4" />}
    >
      Export PNG
    </Button>
  );
}