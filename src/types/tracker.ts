export interface TrackerEntry {
  id: string;
  userId: string;
  date: Date;
  platformId?: string;
  problemsSolved?: number;
  projectsCompleted?: number;
  applicationsSubmitted?: number;
  coursesCompleted?: number;
  timeSpent?: number; // in minutes
  mood?: string;
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
  platformId?: string;
  problemsSolved?: number;
  timeSpent?: number;
  notes?: string;
}

export interface UpdateTrackerEntryData {
  platformId?: string;
  problemsSolved?: number;
  timeSpent?: number;
  notes?: string;
}