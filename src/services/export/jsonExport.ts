import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import type { ExportData, ExportResult } from '@/types/export';

const log = logger.child({ service: 'JSONExport' });

/**
 * Generate JSON export of user data
 */
export async function generateJSON(data: ExportData): Promise<ExportResult> {
  const startTime = Date.now();

  try {
    log.info('Generating JSON export', { userId: data.user.id });

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
        platform: entry.platform,
        category: entry.category,
        problemsSolved: entry.problemsSolved,
        commits: entry.commits,
        timeSpent: entry.timeSpent,
        notes: entry.notes,
      })),
      goals: data.goals.map(goal => ({
        title: goal.title,
        description: goal.description,
        category: goal.category,
        target: goal.target,
        progress: goal.progress,
        status: goal.status,
        deadline: goal.deadline,
        completedAt: goal.completedAt,
      })),
      achievements: data.achievements.map(achievement => ({
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        unlockedAt: achievement.unlockedAt,
        progress: achievement.progress,
      })),
      platforms: data.platforms.map(platform => ({
        name: platform.name,
        category: platform.category,
        isConnected: platform.isConnected,
        lastSynced: platform.lastSynced,
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
      content: json,
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
      content: json,
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