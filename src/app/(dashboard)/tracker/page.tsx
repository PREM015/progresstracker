'use client';

import { useState } from 'react';
import { DatePicker } from '@/components/tracker/DatePicker';
import { DailyWorkFields } from '@/components/tracker/DailyWorkFields';
import { TrackerTable } from '@/components/tracker/TrackerTable';
import { ExportButton } from '@/components/tracker/ExportButton';
import  Select  from '@/components/ui/Select';
import { useTracker } from '@/hooks/useTracker';
import { usePlatforms } from '@/hooks/usePlatforms';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function TrackerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  const { platforms } = usePlatforms();
  const {
    entries,
    isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
    bulkDelete,
  } = useTracker({
    startDate: dateRange.start,
    endDate: dateRange.end,
    platform: selectedPlatform,
  });

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end });
  };

  const handleAddEntry = async (data: any) => {
    await createEntry({
      date: selectedDate,
      ...data,
    });
  };

  const platformOptions = [
    'all',
    ...platforms.map((p) => p.platform.name),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manually track your daily coding progress
          </p>
        </div>
        <ExportButton entries={entries} dateRange={dateRange} />
      </div>

      {/* Date Picker */}
      <DatePicker
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onRangeChange={handleRangeChange}
      />

      {/* Add Entry Form */}
      <DailyWorkFields
        onSubmit={handleAddEntry}
        platforms={platformOptions.filter((p) => p !== 'all')}
      />

      {/* Filter */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <label className="font-medium">Filter by platform:</label>
        <Select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="w-48"
        >
          <option value="all">All Platforms</option>
          {platformOptions
            .filter((p) => p !== 'all')
            .map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
        </Select>
      </div>

      {/* Entries Table */}
      <TrackerTable
        entries={entries}
        isLoading={isLoading}
        onUpdate={updateEntry}
        onDelete={deleteEntry}
        onBulkDelete={bulkDelete}
        onAddNew={() => setSelectedDate(new Date())}
      />
    </div>
  );
}