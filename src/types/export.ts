// src/types/export.ts

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  startDate?: Date;
  endDate?: Date;
  includeGoals?: boolean;
  includeAchievements?: boolean;
  includePlatforms?: boolean;
  includeStats?: boolean;
}

export interface ExportData {
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
  exportDate: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  trackerEntries?: TrackerEntryExport[];
  goals?: GoalExport[];
  achievements?: AchievementExport[];
  platforms?: PlatformExport[];
  stats?: StatsExport;
}

export interface TrackerEntryExport {
  date: string;
  platform: string;
  category: string;
  problemsSolved?: number;
  projectsCompleted?: number;
  applicationsSubmitted?: number;
  coursesCompleted?: number;
  timeSpent?: number;
  mood?: string;
  notes?: string;
}

export interface GoalExport {
  title: string;
  description: string;
  category: string;
  target: number;
  progress: number;
  status: string;
  deadline?: string;
  completedAt?: string;
}

export interface AchievementExport {
  title: string;
  description: string;
  category: string;
  unlockedAt: string;
}

export interface PlatformExport {
  name: string;
  category: string;
  isConnected: boolean;
  lastSynced?: string;
}

export interface StatsExport {
  totalEntries: number;
  totalGoals: number;
  completedGoals: number;
  achievements: number;
  currentStreak: number;
  longestStreak: number;
  totalProblemsSolved: number;
  totalTimeSpent: number;
}

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  fileName: string;
  fileUrl?: string;
  data?: string | Buffer;
  error?: string;
}