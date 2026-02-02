//D:\code\projects\progresstracker\src\lib\validators.ts
import { z } from "zod"

/**
 * User Registration Validation
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
})

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().optional(),
  bio: z.string().optional(),
  image: z.string().url().optional(),
});

// Type ke liye export
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;


export type RegisterInput = z.infer<typeof registerSchema>

/**
 * User Login Validation
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Platform Connection Validation
 */
export const platformConnectionSchema = z.object({
  platformId: z.string().cuid(),
  username: z.string().min(1, "Username is required").optional(),
  token: z.string().optional(),
})

export type PlatformConnectionInput = z.infer<typeof platformConnectionSchema>

/**
 * Tracker Entry Validation
 */
export const trackerEntrySchema = z.object({
  date: z.date(),
  platform: z.string().optional(),
  problems: z.number().int().min(0).max(1000).optional(),
  timeSpent: z.number().int().min(0).max(1440).optional(), // Max 24 hours
  notes: z.string().max(500).optional(),
})

export type TrackerEntryInput = z.infer<typeof trackerEntrySchema>

/**
 * Goal Creation Validation
 */
export const goalSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  target: z.number().int().min(1, "Target must be at least 1"),
  deadline: z.date().optional(),
})

export type GoalInput = z.infer<typeof goalSchema>

/**
 * User Profile Update Validation
 */
export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional(),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

/**
 * Password Change Validation
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>

/**
 * Settings Update Validation
 */
export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  autoSync: z.boolean(),
  syncFrequency: z.enum(["hourly", "daily", "weekly"]),
})

export type SettingsInput = z.infer<typeof settingsSchema>

/**
 * Notification Preferences Validation
 */
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  dailyReminder: z.boolean().optional(),
  goalReminders: z.boolean().optional(),
  achievementAlerts: z.boolean().optional(),
  syncFailures: z.boolean().optional(),
  newFeatures: z.boolean().optional(),
})

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>

/**
 * Custom Platform Validation
 */
export const customPlatformSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  category: z.enum(["DSA", "DEVELOPMENT", "JOBS", "LEARNING", "HACKATHONS", "DESIGN", "PRODUCTS", "OTHER"]),
  icon: z.string().max(10).optional(),
})

export type CustomPlatformInput = z.infer<typeof customPlatformSchema>