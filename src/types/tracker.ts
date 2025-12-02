export interface TrackerEntry {
  id: string;
  userId: string;
  date: Date;
  platform?: string;
  problems?: number;
  timeSpent?: number; // in minutes
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TrackerStats {
  totalProblems: number;
  totalTime: number; // in minutes
  totalDays: number;
  avgProblemsPerDay: number;
  avgTimePerDay: number;
}

export interface CreateTrackerEntryData {
  date: Date;
  platform?: string;
  problems?: number;
  timeSpent?: number;
  notes?: string;
}

export interface UpdateTrackerEntryData {
  platform?: string;
  problems?: number;
  timeSpent?: number;
  notes?: string;
}