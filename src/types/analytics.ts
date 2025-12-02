export interface Stats {
  totalProblems: number;
  totalTime: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  avgProblemsPerDay: number;
  avgTimePerDay: number;
  platformStats: PlatformStat[];
  recentActivity: Activity[];
}

export interface PlatformStat {
  platform: string;
  problems: number;
  time: number;
  count: number;
}

export interface Activity {
  id: string;
  date: Date;
  platform?: string;
  problems?: number;
  timeSpent?: number;
  notes?: string;
}

export interface MonthlyData {
  month: string;
  problems: number;
  time: number;
  activeDays: number;
}

export interface HeatmapData {
  date: string;
  count: number;
}

export interface TrendData {
  date: string;
  problems: number;
}