// src/types/goal-reminder.ts
// Goal reminder / notification schedule types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type ReminderFrequency = 'daily' | 'weekly' | 'custom';
export type ReminderChannel = 'email' | 'push' | 'sms' | 'in_app';
export type ReminderStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Goal reminder record (matches Prisma GoalReminder model) */
export interface GoalReminder {
  id: string;
  goalId: string;
  userId: string;
  title: string;
  message?: string | null;
  frequency: ReminderFrequency;
  channels: ReminderChannel[];
  status: ReminderStatus;
  time: string; // HH:mm in user's timezone
  timezone: string;
  daysOfWeek?: DayOfWeek[] | null; // for weekly
  customCronExpr?: string | null; // for custom
  lastSentAt?: Date | null;
  nextSendAt?: Date | null;
  sendCount: number;
  isEnabled: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Goal reminder with goal info */
export interface GoalReminderWithGoal extends GoalReminder {
  goal: {
    id: string;
    title: string;
    target: number;
    progress: number;
    status: string;
  };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateGoalReminderInput {
  goalId: string;
  title: string;
  message?: string;
  frequency: ReminderFrequency;
  channels: ReminderChannel[];
  time: string; // HH:mm
  timezone?: string;
  daysOfWeek?: DayOfWeek[];
  customCronExpr?: string;
}

export interface UpdateGoalReminderInput extends Partial<CreateGoalReminderInput> {
  isEnabled?: boolean;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface GoalReminderListResponse {
  reminders: GoalReminderWithGoal[];
  total: number;
  activeCount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getNextReminderLabel(nextSendAt: Date | null | undefined): string {
  if (!nextSendAt) return 'Not scheduled';
  const diff = new Date(nextSendAt).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `In ${hours}h`;
  const days = Math.floor(hours / 24);
  return `In ${days}d`;
}

export function formatReminderTime(time: string): string {
  const [hh, mm] = time.split(':');
  const h = parseInt(hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${mm} ${ampm}`;
}

export default GoalReminder;
