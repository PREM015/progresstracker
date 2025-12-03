// src/types/settings.ts

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  autoSync: boolean;
  syncFrequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
  goalReminders: boolean;
  achievementAlerts: boolean;
  publicProfile: boolean;
  showEmail: boolean;
  showStats: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
  dailyReminder: boolean;
  goalReminders: boolean;
  achievementAlerts: boolean;
  syncFailures: boolean;
  newFeatures: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
}

export interface UpdateSettingsRequest {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  dateFormat?: string;
  autoSync?: boolean;
  syncFrequency?: 'hourly' | 'daily' | 'weekly' | 'manual';
  publicProfile?: boolean;
  showEmail?: boolean;
  showStats?: boolean;
}

export interface UpdateNotificationsRequest {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  weeklyReport?: boolean;
  dailyReminder?: boolean;
  goalReminders?: boolean;
  achievementAlerts?: boolean;
  syncFailures?: boolean;
  newFeatures?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface DeleteAccountRequest {
  password: string;
  confirmation: string; // User must type "DELETE"
  reason?: string;
}