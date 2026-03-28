// src/types/goal-history.ts
// Goal progress history types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type GoalHistoryEventType =
  | 'progress_update'
  | 'completed'
  | 'reset'
  | 'target_changed'
  | 'status_changed'
  | 'check'
  | 'milestone';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Goal history record (matches Prisma GoalHistory model) */
export interface GoalHistory {
  id: string;
  goalId: string;
  userId: string;
  eventType: GoalHistoryEventType;
  previousValue?: number | null;
  newValue: number;
  previousStatus?: string | null;
  newStatus?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  recordedAt: Date;
  createdAt: Date;
}

/** Goal history with goal info */
export interface GoalHistoryWithGoal extends GoalHistory {
  goal: {
    id: string;
    title: string;
    target: number;
    unit?: string | null;
    metric: string;
  };
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

/** Goal progress chart data */
export interface GoalProgressChartData {
  goalId: string;
  goalTitle: string;
  target: number;
  series: Array<{
    date: string;
    value: number;
    percentage: number;
  }>;
  completed: boolean;
  completedAt?: Date | null;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface RecordGoalProgressInput {
  goalId: string;
  newValue: number;
  note?: string;
  eventType?: GoalHistoryEventType;
}

export interface GoalHistoryQuery {
  goalId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  eventTypes?: GoalHistoryEventType[];
  limit?: number;
  page?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getGoalHistoryEventLabel(type: GoalHistoryEventType): string {
  const labels: Record<GoalHistoryEventType, string> = {
    progress_update: 'Progress Updated',
    completed: 'Goal Completed! 🎉',
    reset: 'Progress Reset',
    target_changed: 'Target Changed',
    status_changed: 'Status Changed',
    check: 'Daily Check',
    milestone: 'Milestone Reached',
  };
  return labels[type];
}

export default GoalHistory;
