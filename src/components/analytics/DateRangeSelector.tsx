'use client';

import { useState } from 'react';
import  Button  from '@/components/ui/Button';
import { Calendar } from 'lucide-react';

interface DateRangeSelectorProps {
  onRangeChange: (days: number) => void;
  defaultDays?: number;
}

export function DateRangeSelector({ onRangeChange, defaultDays = 30 }: DateRangeSelectorProps) {
  const [selectedDays, setSelectedDays] = useState(defaultDays);

  const ranges = [
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
    { label: '90 Days', days: 90 },
    { label: '1 Year', days: 365 },
  ];

  const handleSelect = (days: number) => {
    setSelectedDays(days);
    onRangeChange(days);
  };

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow">
      <Calendar className="w-5 h-5 text-gray-500" />
      <span className="text-sm font-medium">Period:</span>
      {ranges.map((range) => (
        <Button
          key={range.days}
          size="sm"
          variant={selectedDays === range.days ? 'primary' : 'outline'}
          onClick={() => handleSelect(range.days)}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}