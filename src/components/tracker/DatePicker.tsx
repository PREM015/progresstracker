'use client';

import { useState } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Button  from '@/components/ui/Button';

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onRangeChange?: (start: Date, end: Date) => void;
}

export function DatePicker({ selectedDate, onDateChange, onRangeChange }: DatePickerProps) {
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');

  const handlePrevious = () => {
    if (view === 'day') {
      onDateChange(subDays(selectedDate, 1));
    } else if (view === 'week') {
      const newDate = subDays(selectedDate, 7);
      onDateChange(newDate);
      if (onRangeChange) {
        onRangeChange(startOfWeek(newDate), endOfWeek(newDate));
      }
    } else {
      const newDate = subDays(selectedDate, 30);
      onDateChange(newDate);
      if (onRangeChange) {
        onRangeChange(startOfMonth(newDate), endOfMonth(newDate));
      }
    }
  };

  const handleNext = () => {
    if (view === 'day') {
      onDateChange(addDays(selectedDate, 1));
    } else if (view === 'week') {
      const newDate = addDays(selectedDate, 7);
      onDateChange(newDate);
      if (onRangeChange) {
        onRangeChange(startOfWeek(newDate), endOfWeek(newDate));
      }
    } else {
      const newDate = addDays(selectedDate, 30);
      onDateChange(newDate);
      if (onRangeChange) {
        onRangeChange(startOfMonth(newDate), endOfMonth(newDate));
      }
    }
  };

  const handleToday = () => {
    const today = new Date();
    onDateChange(today);
    if (view === 'week' && onRangeChange) {
      onRangeChange(startOfWeek(today), endOfWeek(today));
    } else if (view === 'month' && onRangeChange) {
      onRangeChange(startOfMonth(today), endOfMonth(today));
    }
  };

  const getDisplayText = () => {
    if (view === 'day') {
      return format(selectedDate, 'MMMM dd, yyyy');
    } else if (view === 'week') {
      const start = startOfWeek(selectedDate);
      const end = endOfWeek(selectedDate);
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
    } else {
      return format(selectedDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrevious}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        />
        <div className="flex items-center gap-2 min-w-[250px] justify-center">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="font-semibold">{getDisplayText()}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleNext}
          leftIcon={<ChevronRight className="w-4 h-4" />}
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={view === 'day' ? 'primary' : 'outline'}
          onClick={() => setView('day')}
        >
          Day
        </Button>
        <Button
          size="sm"
          variant={view === 'week' ? 'primary' : 'outline'}
          onClick={() => {
            setView('week');
            if (onRangeChange) {
              onRangeChange(startOfWeek(selectedDate), endOfWeek(selectedDate));
            }
          }}
        >
          Week
        </Button>
        <Button
          size="sm"
          variant={view === 'month' ? 'primary' : 'outline'}
          onClick={() => {
            setView('month');
            if (onRangeChange) {
              onRangeChange(startOfMonth(selectedDate), endOfMonth(selectedDate));
            }
          }}
        >
          Month
        </Button>
      </div>

      <Button size="sm" variant="outline" onClick={handleToday}>
        Today
      </Button>
    </div>
  );
}