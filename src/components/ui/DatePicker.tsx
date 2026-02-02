/**
 * Component: DatePicker
 * Location: components/ui/DatePicker.tsx
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './Input';

export interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
  </svg>
);

const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
  </svg>
);

export const DatePicker: React.FC<DatePickerProps> = ({
  value, onChange, placeholder = 'Select date', minDate, maxDate, disabled, error, className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const isDateDisabled = (date: Date) => {
    if (minDate && date < new Date(minDate.setHours(0, 0, 0, 0))) return true;
    if (maxDate && date > new Date(maxDate.setHours(23, 59, 59, 999))) return true;
    return false;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (!isDateDisabled(newDate)) {
      onChange?.(newDate);
      setIsOpen(false);
    }
  };

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const renderDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      const isSelected = value && date.toDateString() === value.toDateString();
      const isToday = date.toDateString() === today.toDateString();
      const isDisabled = isDateDisabled(date);

      days.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => handleDateSelect(day)}
          className={cn(
            'w-8 h-8 rounded-full text-sm transition-colors',
            isSelected ? 'bg-(--primary) text-white' : isToday ? 'border border-(--primary) text-(--primary)' : 'hover:bg-(--sidebar-bg)',
            isDisabled && 'opacity-30 cursor-not-allowed'
          )}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Input
        value={value ? formatDate(value) :  ''}
        placeholder={placeholder}
        readOnly
        disabled={disabled}
        error={error}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        rightElement={<CalendarIcon />}
        className="cursor-pointer"
      />
      {isOpen && (
        <div className="absolute z-50 mt-2 p-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg animate-slideIn">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-[var(--sidebar-bg)] rounded"><ChevronLeft /></button>
            <span className="font-medium text-sm">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-[var(--sidebar-bg)] rounded"><ChevronRight /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => <div key={day} className="w-8 h-8 flex items-center justify-center text-xs text-[var(--text-muted)]">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
