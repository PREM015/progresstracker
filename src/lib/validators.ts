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

// ============================================================================
// FILE: src/utils/validators.ts (Consolidated)
// PURPOSE: Client-side validation utilities
// ============================================================================

// EMAIL VALIDATION:
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// PASSWORD VALIDATION:
export interface PasswordStrength {
    score: number; // 0-4
    label: 'weak' | 'fair' | 'good' | 'strong';
    feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    else feedback.push('Use both uppercase and lowercase letters');

    if (/\d/.test(password)) score++;
    else feedback.push('Include at least one number');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    else feedback.push('Include at least one special character');

    const labels: Record<number, PasswordStrength['label']> = {
        0: 'weak',
        1: 'weak',
        2: 'fair',
        3: 'good',
        4: 'strong',
    };

    return {
        score: Math.min(score, 4),
        label: labels[Math.min(score, 4)],
        feedback,
    };
}

// USERNAME VALIDATION:
export function isValidUsername(username: string): { valid: boolean; error?: string } {
    if (username.length < 3) {
        return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (username.length > 30) {
        return { valid: false, error: 'Username must be less than 30 characters' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }
    if (/^[_-]|[_-]$/.test(username)) {
        return { valid: false, error: 'Username cannot start or end with underscore or hyphen' };
    }
    return { valid: true };
}

// URL VALIDATION:
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// PLATFORM USERNAME VALIDATION:
const platformUsernamePatterns: Record<string, RegExp> = {
    github: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/,
    leetcode: /^[a-zA-Z0-9_-]{1,15}$/,
    codeforces: /^[a-zA-Z0-9_]{3,24}$/,
    codechef: /^[a-zA-Z0-9_]{3,14}$/,
    hackerrank: /^[a-zA-Z0-9_-]{3,32}$/,
    // Add other platforms as needed
};

export function isValidPlatformUsername(platform: string, username: string): boolean {
    const pattern = platformUsernamePatterns[platform.toLowerCase()];
    if (!pattern) return username.length > 0; // Default: just non-empty
    return pattern.test(username);
}

// DATE VALIDATION:
export function isValidDate(date: string): boolean {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
}

export function isDateInPast(date: Date | string): boolean {
    return new Date(date) < new Date();
}

export function isDateInFuture(date: Date | string): boolean {
    return new Date(date) > new Date();
}

// FORM VALIDATION HELPERS:
export function validateRequired(value: unknown, fieldName = 'This field'): string | null {
    if (value === undefined || value === null || value === '') {
        return `${fieldName} is required`;
    }
    return null;
}

export function validateMinLength(value: string, min: number, fieldName = 'This field'): string | null {
    if (value.length < min) {
        return `${fieldName} must be at least ${min} characters`;
    }
    return null;
}

export function validateMaxLength(value: string, max: number, fieldName = 'This field'): string | null {
    if (value.length > max) {
        return `${fieldName} must be no more than ${max} characters`;
    }
    return null;
}

// COMBINED VALIDATOR:
type ValidatorFn = (value: unknown) => string | null;

export function validate(value: unknown, validators: ValidatorFn[]): string | null {
    for (const validator of validators) {
        const error = validator(value);
        if (error) return error;
    }
    return null;
}

// ASYNC VALIDATION (for username/email availability):
export async function checkAvailability(
    type: 'email' | 'username',
    value: string
): Promise<boolean> {
    try {
        const response = await fetch(`/api/auth/check-${type}?value=${encodeURIComponent(value)}`);
        const data = await response.json();
        return data.available;
    } catch {
        return true; // Assume available on error
    }
}