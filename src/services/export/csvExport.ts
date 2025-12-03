// src/services/export/csvExport.ts

import Papa from 'papaparse';
import type { ExportData, ExportResult } from '@/types/export';
import { format } from 'date-fns';

export async function generateCSV(data: ExportData): Promise<ExportResult> {
  try {
    // Prepare tracker entries for CSV
    const csvData = data.trackerEntries?.map((entry) => ({
      Date: format(new Date(entry.date), 'yyyy-MM-dd'),
      Platform: entry.platform,
      Category: entry.category,
      'Problems Solved': entry.problemsSolved || 0,
      'Projects Completed': entry.projectsCompleted || 0,
      'Applications Submitted': entry.applicationsSubmitted || 0,
      'Courses Completed': entry.coursesCompleted || 0,
      'Time Spent (min)': entry.timeSpent || 0,
      Mood: entry.mood || '',
      Notes: entry.notes || '',
    })) || [];

    // Generate CSV string
    const csv = Papa.unparse(csvData, {
      quotes: true,
      header: true,
    });

    // Generate filename
    const fileName = `codesync-export-${format(data.exportDate, 'yyyy-MM-dd')}.csv`;

    return {
      success: true,
      format: 'csv',
      fileName,
      data: csv,
    };
  } catch (error) {
    console.error('CSV generation error:', error);
    return {
      success: false,
      format: 'csv',
      fileName: '',
      error: error instanceof Error ? error.message : 'CSV generation failed',
    };
  }
}