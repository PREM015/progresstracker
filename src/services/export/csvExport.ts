// src/services/export/csvExport.ts
import { logger } from '@/lib/logger';
import type { ExportData, ExportResult } from '@/types/export';
import Papa from 'papaparse';

const log = logger.child({ service: 'CSVExport' });

export async function generateCSV(data: ExportData): Promise<ExportResult> {
  try {
    const csvData = data.trackerEntries.map((entry) => ({
      Date: entry.date,
      Platform: entry.platform,
      Category: entry.category,
      'Problems Solved': entry.problemsSolved || 0,
      'Projects Completed': entry.projectsCompleted || 0,
      'Applications Submitted': entry.applicationsSubmitted || 0,
      'Courses Completed': entry.coursesCompleted || 0,
      'Time Spent (min)': entry.timeSpent || 0,
      Mood: entry.mood || '',
      Notes: entry.notes || '',
    }));

    const csv = Papa.unparse(csvData);
    const fileName = `progress-tracker-${new Date().toISOString().split('T')[0]}.csv`;

    log.info('CSV export generated', { fileName, rows: csvData.length });

    return {
      success: true,
      format: 'csv',
      fileName,
      content: csv,
    };
  } catch (error) {
    log.error('Error generating CSV export', {}, error);
    return {
      success: false,
      format: 'csv',
      fileName: '',
      error: error instanceof Error ? error.message : 'CSV generation failed',
    };
  }
}

export default generateCSV;