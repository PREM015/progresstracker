// src/services/export/jsonExport.ts

import type { ExportData, ExportResult } from '@/types/export';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

export async function generateJSON(data: ExportData): Promise<ExportResult> {
  try {
    // Create structured JSON export
    const exportData = {
      metadata: {
        exportedBy: data.user.name,
        exportedAt: data.exportDate.toISOString(),
        dateRange: {
          start: data.dateRange.start.toISOString(),
          end: data.dateRange.end.toISOString(),
        },
        version: '1.0',
      },
      user: {
        name: data.user.name,
        email: data.user.email,
        username: data.user.username,
      },
      statistics: data.stats,
      trackerEntries: data.trackerEntries,
      goals: data.goals,
      achievements: data.achievements,
      platforms: data.platforms,
    };

    // Convert to formatted JSON string
    const json = JSON.stringify(exportData, null, 2);

    // Generate filename
    const fileName = `codesync-export-${format(data.exportDate, 'yyyy-MM-dd')}.json`;

    return {
      success: true,
      format: 'json',
      fileName,
      data: json,
    };
  } catch (error) {
    logger.error('JSON generation error:', error as Error);
    return {
      success: false,
      format: 'json',
      fileName: '',
      error: error instanceof Error ? error.message : 'JSON generation failed',
    };
  }
}