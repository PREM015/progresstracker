// src/trigger/index.ts
// Central export for all trigger tasks

// Sync tasks
export { syncUserPlatformsTask, dailySyncAllUsersTask, syncSpecificPlatformsTask } from './sync-all-platforms';

// Daily sync
export { dailySyncTask } from './daily-sync-task';

// Scheduled tasks
export {
  weeklyStatsEmailTask,
  goalReminderTask,
  cleanupOldLogsTask,
  checkStaleConnectionsTask,
  streakCheckTask,
} from './scheduled-tasks';

// Achievement check
export { checkAchievementsTask } from './achievement-check';

// Legacy/specific platform tasks (optional - can be removed if using generic)
export { syncGitHubTask } from './github-sync';
export { syncLeetCodeTask } from './leetcode-sync';

// User platform sync
export { syncSingleUserTask } from './sync-user-platforms';

// User stats
export { updateUserStats } from './user-stats';

// Scraper (replaces BullMQ scraper workers)
export { scraperTask } from './scraper-task';

// Email (replaces BullMQ email worker)
export { emailTask } from './email-task';

// Stats precomputation (replaces BullMQ stats worker)
export { statsTask, dailyStatsBatchTask } from './stats-task';

// Notifications (replaces BullMQ notification worker)
export { notificationTask, notificationBulkTask } from './notification-task';

// Exports (replaces BullMQ export worker)
export { exportTask } from './export-task';

// Reports (replaces BullMQ report worker)
export { reportTask } from './report-task';

// Example/testing
export { helloWorldTask } from './example';