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

// Example/testing
export { helloWorldTask } from './example';