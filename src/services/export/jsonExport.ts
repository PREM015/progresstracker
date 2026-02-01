/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/export/jsonExport.ts
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

const log = logger.child({ service: 'JSONExport' });

export interface ExportData {
  user: {
    name: string | null;
    email: string | null;
    username: string | null;
  };
  exportDate: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  stats: any;
  trackerEntries: any[];
  goals: any[];
  achievements: any[];
  platforms: any[];
}

export interface ExportResult {
  success: boolean;
  format: 'json';
  fileName: string;
  data?: string;
  error?: string;
  fileSize?: number;
}

/**
 * Generate JSON export of user data
 */
export async function generateJSON(data: ExportData): Promise<ExportResult> {
  const startTime = Date.now();
  
  try {
    log.info('Generating JSON export', { userId: data.user.username });

    // Create structured JSON export
    const exportData = {
      metadata: {
        exportedBy: data.user.name,
        exportedAt: data.exportDate.toISOString(),
        dateRange: {
          start: data.dateRange.start.toISOString(),
          end: data.dateRange.end.toISOString(),
        },
        version: '1.0.0',
        format: 'json',
      },
      user: {
        name: data.user.name,
        email: data.user.email,
        username: data.user.username,
      },
      statistics: data.stats,
      trackerEntries: data.trackerEntries.map(entry => ({
        date: entry.date,
        platform: entry.platform?.name,
        category: entry.category,
        problemsSolved: entry.problemsSolved,
        commits: entry.commits,
        timeSpent: entry.timeSpent,
        notes: entry.notes,
        customFields: entry.customFields,
      })),
      goals: data.goals.map(goal => ({
        title: goal.title,
        description: goal.description,
        category: goal.category,
        goalType: goal.goalType,
        metric: goal.metric,
        target: goal.target,
        progress: goal.progress,
        status: goal.status,
        startDate: goal.startDate,
        endDate: goal.endDate,
        completedAt: goal.completedAt,
      })),
      achievements: data.achievements.map(achievement => ({
        title: achievement.achievement?.title,
        description: achievement.achievement?.description,
        tier: achievement.achievement?.tier,
        unlockedAt: achievement.unlockedAt,
        progress: achievement.progress,
      })),
      platforms: data.platforms.map(platform => ({
        name: platform.platform?.name,
        category: platform.platform?.category,
        username: platform.username,
        profileUrl: platform.profileUrl,
        isActive: platform.isActive,
        lastSyncedAt: platform.lastSyncedAt,
        cachedStats: platform.cachedStats,
      })),
    };

    // Convert to formatted JSON string
    const json = JSON.stringify(exportData, null, 2);
    const fileSize = Buffer.byteLength(json, 'utf8');

    // Generate filename
    const fileName = `codesync-export-${format(data.exportDate, 'yyyy-MM-dd-HHmmss')}.json`;

    const duration = Date.now() - startTime;
    log.info('JSON export generated', { fileName, fileSize, duration });

    return {
      success: true,
      format: 'json',
      fileName,
      data: json,
      fileSize,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    log.error('JSON generation failed', { duration }, error);
    
    return {
      success: false,
      format: 'json',
      fileName: '',
      error: error instanceof Error ? error.message : 'JSON generation failed',
    };
  }
}

/**
 * Generate compact JSON (minified)
 */
export async function generateCompactJSON(data: ExportData): Promise<ExportResult> {
  try {
    const exportData = {
      meta: {
        user: data.user.username,
        date: data.exportDate.toISOString(),
      },
      data: {
        stats: data.stats,
        entries: data.trackerEntries,
        goals: data.goals,
        achievements: data.achievements,
      },
    };

    // Minified JSON
    const json = JSON.stringify(exportData);
    const fileSize = Buffer.byteLength(json, 'utf8');
    const fileName = `codesync-compact-${format(data.exportDate, 'yyyy-MM-dd')}.json`;

    return {
      success: true,
      format: 'json',
      fileName,
      data: json,
      fileSize,
    };

  } catch (error) {
    log.error('Compact JSON generation failed', {}, error);
    
    return {
      success: false,
      format: 'json',
      fileName: '',
      error: error instanceof Error ? error.message : 'Compact JSON generation failed',
    };
  }
}