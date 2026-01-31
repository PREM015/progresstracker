/* eslint-disable @typescript-eslint/no-unused-vars */
// src/services/userService.ts
import { prisma, paginationArgs, buildPaginationResponse, withTransaction } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { logger } from "@trigger.dev/sdk/v3";

// =============================================================================
// TYPES
// =============================================================================

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  username?: string;
  bio?: string;
  image?: string;
  avatar?: string; // Alias for image
  location?: string;
  website?: string;
  company?: string;
  jobTitle?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  discordUsername?: string;
}

export interface UpdateSettingsInput {
  // Appearance
  theme?: "light" | "dark" | "system";
  accentColor?: string;
  compactMode?: boolean;
  fontSize?: "small" | "medium" | "large";
  reducedMotion?: boolean;
  highContrast?: boolean;

  // Localization
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: "12h" | "24h";
  weekStartsOn?: number;
  numberFormat?: string;

  // Sync Preferences
  autoSync?: boolean;
  syncFrequency?: "realtime" | "hourly" | "daily" | "manual";
  syncOnLogin?: boolean;
  syncInBackground?: boolean;

  // Privacy
  publicProfile?: boolean;
  showInLeaderboard?: boolean;
  allowAnalytics?: boolean;
  allowCookies?: boolean;

  // Dashboard
  dashboardLayout?: Record<string, unknown> | null;
  defaultDateRange?: string;
  showWelcomeBanner?: boolean;

  // Features
  keyboardShortcuts?: boolean;
  soundEffects?: boolean;
  desktopNotifications?: boolean;

  // Data
  dataRetentionDays?: number;
}

export interface UpdateNotificationsInput {
  // Global Settings
  enabled?: boolean;

  // Channels
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  smsEnabled?: boolean;

  // Email Preferences
  emailAddress?: string | null;

  // Notification Types
  achievementAlerts?: boolean;
  goalReminders?: boolean;
  goalCompleted?: boolean;
  streakAlerts?: boolean;
  syncComplete?: boolean;
  syncFailed?: boolean;
  weeklyReport?: boolean;
  monthlyReport?: boolean;
  securityAlerts?: boolean;
  billingAlerts?: boolean;
  newFeatures?: boolean;
  tips?: boolean;
  communityUpdates?: boolean;
  marketingEmails?: boolean;

  // Quiet Hours
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;

  // Digest Settings
  digestEnabled?: boolean;
  digestFrequency?: "realtime" | "daily" | "weekly";
  digestTime?: string;
  digestDay?: number;

  // DND
  dndEnabled?: boolean;
  dndUntil?: Date | null;
}

export interface UpdateVisibilityInput {
  isPublic?: boolean;
  showEmail?: boolean;
  showLocation?: boolean;
  showActivity?: boolean;
  showAchievements?: boolean;
  showGoals?: boolean;
  showPlatforms?: boolean;
  showStreak?: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserProfileResponse {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  bio: string | null;
  image: string | null;
  location: string | null;
  website: string | null;
  company: string | null;
  jobTitle: string | null;
  githubUsername: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  discordUsername: string | null;
  isPublic: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showActivity: boolean;
  showAchievements: boolean;
  showGoals: boolean;
  showPlatforms: boolean;
  showStreak: boolean;
  isVerified: boolean;
  currentStreak: number;
  longestStreak: number;
  totalProblems: number;
  totalCommits: number;
  totalProjects: number;
  totalCertifications: number;
  totalAchievements: number;
  totalPoints: number;
  rank: number | null;
  preferredLanguage: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStatsResponse {
  totalEntries: number;
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  failedGoals: number;
  achievements: number;
  platforms: number;
  customPlatforms: number;
  currentStreak: number;
  longestStreak: number;
  totalProblems: number;
  totalCommits: number;
  totalPullRequests: number;
  totalTimeSpent: number;
  totalPoints: number;
  lastActivityDate: Date | null;
  memberSince: Date;
  daysActive: number;
}

export interface PublicProfileResponse {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  image: string | null;
  location: string | null;
  website: string | null;
  company: string | null;
  jobTitle: string | null;
  githubUsername: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  currentStreak: number;
  longestStreak: number;
  totalProblems: number;
  totalCommits: number;
  totalAchievements: number;
  totalPoints: number;
  rank: number | null;
  createdAt: Date;
  visibility: {
    showEmail: boolean;
    showLocation: boolean;
    showActivity: boolean;
    showAchievements: boolean;
    showGoals: boolean;
    showPlatforms: boolean;
    showStreak: boolean;
  };
}

// =============================================================================
// USER SERVICE CLASS
// =============================================================================

export class UserService {
  // ===========================================================================
  // GET USER
  // ===========================================================================

  /**
   * Get user by ID with full profile
   */
  static async getUserProfile(userId: string): Promise<UserProfileResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        location: true,
        website: true,
        company: true,
        jobTitle: true,
        githubUsername: true,
        linkedinUrl: true,
        twitterHandle: true,
        discordUsername: true,
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
        isVerified: true,
        currentStreak: true,
        longestStreak: true,
        totalProblems: true,
        totalCommits: true,
        totalProjects: true,
        totalCertifications: true,
        totalAchievements: true,
        totalPoints: true,
        rank: true,
        preferredLanguage: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Get user profile with settings and counts
   */
  static async getUserProfileWithDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        notificationPrefs: true,
        _count: {
          select: {
            trackerEntries: true,
            goals: true,
            achievements: true,
            platforms: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }
    // Remove sensitive data
    const { password, ...userWithoutPassword } = user;
   logger.info("User with details fetched", { userId: user.id });

    return userWithoutPassword;
  }

  /**
   * Get user by ID (minimal data)
   */
  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        isActive: true,
        isVerified: true,
        isBanned: true,
        role: true,
      },
    });
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        username: true,
        password: true,
        image: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        role: true,
        isAdmin: true,
      },
    });
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Check if username exists
   */
  static async usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        username: username.toLowerCase(),
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return !!user;
  }

  // ===========================================================================
  // PUBLIC PROFILE
  // ===========================================================================

  /**
   * Get public profile by username
   */
  static async getPublicProfile(username: string): Promise<PublicProfileResponse | null> {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        image: true,
        location: true,
        website: true,
        company: true,
        jobTitle: true,
        githubUsername: true,
        linkedinUrl: true,
        twitterHandle: true,
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
        currentStreak: true,
        longestStreak: true,
        totalProblems: true,
        totalCommits: true,
        totalAchievements: true,
        totalPoints: true,
        rank: true,
        createdAt: true,
      },
    });

    if (!user || !user.isPublic) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      image: user.image,
      location: user.showLocation ? user.location : null,
      website: user.website,
      company: user.company,
      jobTitle: user.jobTitle,
      githubUsername: user.githubUsername,
      linkedinUrl: user.linkedinUrl,
      twitterHandle: user.twitterHandle,
      currentStreak: user.showStreak ? user.currentStreak : 0,
      longestStreak: user.showStreak ? user.longestStreak : 0,
      totalProblems: user.showActivity ? user.totalProblems : 0,
      totalCommits: user.showActivity ? user.totalCommits : 0,
      totalAchievements: user.showAchievements ? user.totalAchievements : 0,
      totalPoints: user.totalPoints,
      rank: user.rank,
      createdAt: user.createdAt,
      visibility: {
        showEmail: user.showEmail,
        showLocation: user.showLocation,
        showActivity: user.showActivity,
        showAchievements: user.showAchievements,
        showGoals: user.showGoals,
        showPlatforms: user.showPlatforms,
        showStreak: user.showStreak,
      },
    };
  }

  /**
   * Get public profile with activity data
   */
  static async getPublicProfileWithActivity(username: string) {
    const profile = await this.getPublicProfile(username);

    if (!profile) {
      return null;
    }

    // Get activity data based on visibility settings
    const activityData: {
      platforms?: unknown[];
      recentActivity?: unknown[];
      achievements?: unknown[];
      goals?: unknown[];
    } = {};

    if (profile.visibility.showPlatforms) {
      activityData.platforms = await prisma.userPlatform.findMany({
        where: { userId: profile.id, isActive: true },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
        take: 10,
      });
    }

    if (profile.visibility.showActivity) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      activityData.recentActivity = await prisma.trackerEntry.findMany({
        where: {
          userId: profile.id,
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "desc" },
        take: 30,
        select: {
          date: true,
          problemsSolved: true,
          commits: true,
          timeSpent: true,
          platform: {
            select: {
              name: true,
              icon: true,
            },
          },
        },
      });
    }

    if (profile.visibility.showAchievements) {
      activityData.achievements = await prisma.userAchievement.findMany({
        where: { userId: profile.id },
        include: {
          achievement: true,
        },
        orderBy: { unlockedAt: "desc" },
        take: 10,
      });
    }

    if (profile.visibility.showGoals) {
      activityData.goals = await prisma.goal.findMany({
        where: {
          userId: profile.id,
          isPublic: true,
          status: { in: ["ACTIVE", "COMPLETED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    }

    return {
      ...profile,
      ...activityData,
    };
  }

  // ===========================================================================
  // UPDATE PROFILE
  // ===========================================================================

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: UpdateProfileInput) {
    // Validate email uniqueness
    if (data.email) {
      const emailExists = await this.emailExists(data.email, userId);
      if (emailExists) {
        throw new Error("Email already in use");
      }
    }

    // Validate username
    if (data.username) {
      const normalizedUsername = data.username.toLowerCase().trim();

      // Validate format
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(normalizedUsername)) {
        throw new Error(
          "Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens"
        );
      }

      const usernameExists = await this.usernameExists(normalizedUsername, userId);
      if (usernameExists) {
        throw new Error("Username already taken");
      }

      data.username = normalizedUsername;
    }

    // Validate URLs
    if (data.website && !isValidUrl(data.website)) {
      throw new Error("Invalid website URL");
    }

    if (data.linkedinUrl && !isValidUrl(data.linkedinUrl)) {
      throw new Error("Invalid LinkedIn URL");
    }

    // Build update data
    const updateData: Prisma.UserUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.username !== undefined) updateData.username = data.username;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.avatar !== undefined) updateData.image = data.avatar; // Alias
    if (data.location !== undefined) updateData.location = data.location;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.githubUsername !== undefined) updateData.githubUsername = data.githubUsername;
    if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl;
    if (data.twitterHandle !== undefined) {
      updateData.twitterHandle = sanitizeTwitterHandle(data.twitterHandle);
    }
    if (data.discordUsername !== undefined) updateData.discordUsername = data.discordUsername;

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        location: true,
        website: true,
        company: true,
        jobTitle: true,
        githubUsername: true,
        linkedinUrl: true,
        twitterHandle: true,
        discordUsername: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update profile visibility
   */
  static async updateVisibility(userId: string, data: UpdateVisibilityInput) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        isPublic: true,
        showEmail: true,
        showLocation: true,
        showActivity: true,
        showAchievements: true,
        showGoals: true,
        showPlatforms: true,
        showStreak: true,
      },
    });
  }

  /**
   * Update avatar/image
   */
  static async updateAvatar(userId: string, imageUrl: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        image: imageUrl,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        image: true,
      },
    });
  }

  /**
   * Remove avatar
   */
  static async removeAvatar(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        image: null,
        updatedAt: new Date(),
      },
    });
  }

  // ===========================================================================
  // SETTINGS
  // ===========================================================================

  /**
   * Get user settings
   */
  static async getSettings(userId: string) {
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  /**
   * Update user settings
   */
  static async updateSettings(userId: string, data: UpdateSettingsInput) {
    // Validate
    const errors = validateSettingsData(data);
    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }

    // Check if settings exist
    const existing = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Prepare dashboard layout
    let dashboardLayout: Prisma.InputJsonValue | undefined;
    if (data.dashboardLayout !== undefined) {
      dashboardLayout = data.dashboardLayout === null
        ? (Prisma.JsonNull as unknown as Prisma.InputJsonValue)
        : (data.dashboardLayout as Prisma.InputJsonValue);
    }

    const settingsData = {
      theme: data.theme,
      accentColor: data.accentColor,
      compactMode: data.compactMode,
      fontSize: data.fontSize,
      reducedMotion: data.reducedMotion,
      highContrast: data.highContrast,
      language: data.language,
      timezone: data.timezone,
      dateFormat: data.dateFormat,
      timeFormat: data.timeFormat,
      weekStartsOn: data.weekStartsOn,
      numberFormat: data.numberFormat,
      autoSync: data.autoSync,
      syncFrequency: data.syncFrequency,
      syncOnLogin: data.syncOnLogin,
      syncInBackground: data.syncInBackground,
      publicProfile: data.publicProfile,
      showInLeaderboard: data.showInLeaderboard,
      allowAnalytics: data.allowAnalytics,
      allowCookies: data.allowCookies,
      dashboardLayout,
      defaultDateRange: data.defaultDateRange,
      showWelcomeBanner: data.showWelcomeBanner,
      keyboardShortcuts: data.keyboardShortcuts,
      soundEffects: data.soundEffects,
      desktopNotifications: data.desktopNotifications,
      dataRetentionDays: data.dataRetentionDays,
      updatedAt: new Date(),
    };

    // Remove undefined values
    const cleanedData = removeUndefined(settingsData);

    if (!existing) {
      return prisma.userSettings.create({
        data: {
          userId,
          ...cleanedData,
        },
      });
    }

    return prisma.userSettings.update({
      where: { userId },
      data: cleanedData,
    });
  }

  // ===========================================================================
  // NOTIFICATION PREFERENCES
  // ===========================================================================

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences(userId: string) {
    let prefs = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await prisma.notificationPreferences.create({
        data: { userId },
      });
    }

    return prefs;
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(userId: string, data: UpdateNotificationsInput) {
    // Validate
    const errors = validateNotificationData(data);
    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }

    const existing = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    const prefsData = {
      enabled: data.enabled,
      emailEnabled: data.emailEnabled,
      pushEnabled: data.pushEnabled,
      inAppEnabled: data.inAppEnabled,
      smsEnabled: data.smsEnabled,
      emailAddress: data.emailAddress ?? undefined,
      achievementAlerts: data.achievementAlerts,
      goalReminders: data.goalReminders,
      goalCompleted: data.goalCompleted,
      streakAlerts: data.streakAlerts,
      syncComplete: data.syncComplete,
      syncFailed: data.syncFailed,
      weeklyReport: data.weeklyReport,
      monthlyReport: data.monthlyReport,
      securityAlerts: data.securityAlerts,
      billingAlerts: data.billingAlerts,
      newFeatures: data.newFeatures,
      tips: data.tips,
      communityUpdates: data.communityUpdates,
      marketingEmails: data.marketingEmails,
      quietHoursEnabled: data.quietHoursEnabled,
      quietHoursStart: data.quietHoursStart,
      quietHoursEnd: data.quietHoursEnd,
      quietHoursTimezone: data.quietHoursTimezone,
      digestEnabled: data.digestEnabled,
      digestFrequency: data.digestFrequency,
      digestTime: data.digestTime,
      digestDay: data.digestDay,
      dndEnabled: data.dndEnabled,
      dndUntil: data.dndUntil ?? undefined,
      updatedAt: new Date(),
    };

    const cleanedData = removeUndefined(prefsData);

    if (!existing) {
      return prisma.notificationPreferences.create({
        data: {
          userId,
          ...cleanedData,
        },
      });
    }

    return prisma.notificationPreferences.update({
      where: { userId },
      data: cleanedData,
    });
  }

  // ===========================================================================
  // PASSWORD MANAGEMENT
  // ===========================================================================

  /**
   * Check if user has password set
   */
  static async hasPassword(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    return !!user?.password;
  }

  /**
   * Verify password
   */
  static async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user?.password) {
      return false;
    }

    return compare(password, user.password);
  }

  /**
   * Change password
   */
  static async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.password) {
      throw new Error("No password set. Use 'Set Password' for OAuth accounts.");
    }

    // Verify current password
    const isValid = await compare(data.currentPassword, user.password);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    if (data.newPassword !== data.confirmPassword) {
      throw new Error("New passwords do not match");
    }

    const passwordErrors = validatePassword(data.newPassword);
    if (passwordErrors.length > 0) {
      throw new Error(passwordErrors.join(", "));
    }

    // Check if same as current
    const isSamePassword = await compare(data.newPassword, user.password);
    if (isSamePassword) {
      throw new Error("New password must be different from current password");
    }

    // Hash and update
    const hashedPassword = await hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Invalidate other sessions (optional - you may want to keep current session)
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isValid: false, revokedAt: new Date(), revokedReason: "password_changed" },
    });

    return { success: true, message: "Password changed successfully" };
  }

  /**
   * Set password (for OAuth users)
   */
  static async setPassword(userId: string, newPassword: string, confirmPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.password) {
      throw new Error("Password already set. Use change password instead.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      throw new Error(passwordErrors.join(", "));
    }

    const hashedPassword = await hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { success: true, message: "Password set successfully" };
  }

  /**
   * Reset password (after verification)
   */
  static async resetPassword(userId: string, newPassword: string) {
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      throw new Error(passwordErrors.join(", "));
    }

    const hashedPassword = await hash(newPassword, 12);

    await withTransaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Invalidate all sessions
      await tx.session.deleteMany({ where: { userId } });
      await tx.activeSession.updateMany({
        where: { userId },
        data: { isValid: false, revokedAt: new Date(), revokedReason: "password_reset" },
      });
      await tx.refreshToken.updateMany({
        where: { userId },
        data: { isValid: false, revokedAt: new Date(), revokedReason: "password_reset" },
      });

      // Mark password reset tokens as used
      await tx.passwordReset.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    return { success: true, message: "Password reset successfully" };
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<UserStatsResponse> {
    const [
      user,
      entriesCount,
      goalsCount,
      completedGoalsCount,
      activeGoalsCount,
      failedGoalsCount,
      achievementsCount,
      platformsCount,
      customPlatformsCount,
      timeSpent,
      pullRequestsSum,
      distinctDates,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          longestStreak: true,
          totalProblems: true,
          totalCommits: true,
          totalPoints: true,
          lastActivityDate: true,
          createdAt: true,
        },
      }),
      prisma.trackerEntry.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: "COMPLETED" } }),
      prisma.goal.count({ where: { userId, status: "ACTIVE" } }),
      prisma.goal.count({ where: { userId, status: "FAILED" } }),
      prisma.userAchievement.count({ where: { userId } }),
      prisma.userPlatform.count({ where: { userId, isActive: true } }),
      prisma.customPlatform.count({ where: { userId, isActive: true } }),
      prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: { timeSpent: true },
      }),
      prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: { pullRequests: true },
      }),
      prisma.trackerEntry.findMany({
        where: { userId },
        select: { date: true },
        distinct: ["date"],
      }),
    ]);

    // Calculate current streak if not cached
    let currentStreak = user?.currentStreak ?? 0;
    if (currentStreak === 0 && entriesCount > 0) {
      currentStreak = await this.calculateCurrentStreak(userId);
    }

    return {
      totalEntries: entriesCount,
      totalGoals: goalsCount,
      completedGoals: completedGoalsCount,
      activeGoals: activeGoalsCount,
      failedGoals: failedGoalsCount,
      achievements: achievementsCount,
      platforms: platformsCount,
      customPlatforms: customPlatformsCount,
      currentStreak,
      longestStreak: Math.max(user?.longestStreak ?? 0, currentStreak),
      totalProblems: user?.totalProblems ?? 0,
      totalCommits: user?.totalCommits ?? 0,
      totalPullRequests: pullRequestsSum._sum.pullRequests ?? 0,
      totalTimeSpent: timeSpent._sum.timeSpent ?? 0,
      totalPoints: user?.totalPoints ?? 0,
      lastActivityDate: user?.lastActivityDate ?? null,
      memberSince: user?.createdAt ?? new Date(),
      daysActive: distinctDates.length,
    };
  }

  /**
   * Calculate current streak
   */
  static async calculateCurrentStreak(userId: string): Promise<number> {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: { date: true },
      distinct: ["date"],
      take: 366,
    });

    if (entries.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;

    for (let i = 0; i < entries.length; i++) {
      const entryDate = new Date(entries[i].date);
      entryDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);

      const diffDays = Math.floor(
        (expectedDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // First iteration: allow today or yesterday
      if (i === 0 && diffDays > 1) {
        break;
      }

      if (diffDays === 0 || (i === 0 && diffDays === 1)) {
        streak++;
      } else {
        break;
      }
    }

    // Update cached streak
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: streak,
        longestStreak: {
          // Only update if new streak is longer
          set: streak,
        },
      },
    }).catch(() => {
      // Ignore update errors
    });

    return streak;
  }

  /**
   * Update last activity timestamp
   */
  static async updateLastActivity(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Update user totals (called after tracker changes)
   */
  static async updateUserTotals(userId: string) {
    const [aggregates, streakInfo] = await Promise.all([
      prisma.trackerEntry.aggregate({
        where: { userId },
        _sum: {
          problemsSolved: true,
          commits: true,
          projectsCompleted: true,
          certificationsEarned: true,
          points: true,
          pointsEarned: true,
        },
      }),
      this.calculateCurrentStreak(userId),
    ]);

    const achievementsCount = await prisma.userAchievement.count({
      where: { userId },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalProblems: aggregates._sum.problemsSolved ?? 0,
        totalCommits: aggregates._sum.commits ?? 0,
        totalProjects: aggregates._sum.projectsCompleted ?? 0,
        totalCertifications: aggregates._sum.certificationsEarned ?? 0,
        totalPoints: (aggregates._sum.points ?? 0) + (aggregates._sum.pointsEarned ?? 0),
        totalAchievements: achievementsCount,
        currentStreak: streakInfo,
        lastActivityDate: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // ===========================================================================
  // ACCOUNT DELETION
  // ===========================================================================

  /**
   * Soft delete user account
   */
  static async deleteAccount(userId: string, password?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, email: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify password if set
    if (user.password && password) {
      const isValid = await compare(password, user.password);
      if (!isValid) {
        throw new Error("Incorrect password");
      }
    } else if (user.password && !password) {
      throw new Error("Password required to delete account");
    }

    await withTransaction(async (tx) => {
      // Anonymize user data (soft delete)
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}_${Date.now()}@deleted.local`,
          name: "Deleted User",
          username: null,
          password: null,
          image: null,
          bio: null,
          location: null,
          website: null,
          company: null,
          jobTitle: null,
          githubUsername: null,
          linkedinUrl: null,
          twitterHandle: null,
          discordUsername: null,
          isActive: false,
          isPublic: false,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Delete all sessions
      await tx.session.deleteMany({ where: { userId } });
      await tx.activeSession.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });

      // Delete security data
      await tx.twoFactorAuth.deleteMany({ where: { userId } });
      await tx.backupCode.deleteMany({ where: { userId } });
      await tx.apiKey.deleteMany({ where: { userId } });
      await tx.passwordReset.deleteMany({ where: { userId } });
      await tx.emailVerification.deleteMany({ where: { userId } });
      await tx.emailChangeRequest.deleteMany({ where: { userId } });

      // Delete push subscriptions
      await tx.pushSubscription.deleteMany({ where: { userId } });
    });

    return { success: true, message: "Account deleted successfully" };
  }

  /**
   * Permanently delete user (admin or after retention period)
   */
  static async permanentlyDeleteAccount(userId: string) {
    // This will cascade delete all related data
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true, message: "Account permanently deleted" };
  }

  /**
   * Restore soft-deleted account (admin)
   */
  static async restoreAccount(userId: string, newEmail: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });

    if (!user?.deletedAt) {
      throw new Error("Account is not deleted");
    }

    // Check email availability
    const emailExists = await this.emailExists(newEmail);
    if (emailExists) {
      throw new Error("Email already in use");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail.toLowerCase(),
        isActive: true,
        deletedAt: null,
        updatedAt: new Date(),
      },
    });

    return { success: true, message: "Account restored successfully" };
  }

  // ===========================================================================
  // ADMIN FUNCTIONS
  // ===========================================================================

  /**
   * Get all users (admin)
   */
  static async getAllUsers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    isBanned?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      isBanned,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options ?? {};

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isBanned !== undefined) {
      where.isBanned = isBanned;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        ...paginationArgs(page, limit),
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          role: true,
          isActive: true,
          isBanned: true,
          isVerified: true,
          currentStreak: true,
          totalPoints: true,
          createdAt: true,
          lastActiveAt: true,
          _count: {
            select: {
              platforms: true,
              trackerEntries: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return buildPaginationResponse(users, total, page, limit);
  }

  /**
   * Ban user (admin)
   */
  static async banUser(userId: string, reason: string, adminId: string) {
    await withTransaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          isBanned: true,
          banReason: reason,
          bannedAt: new Date(),
          bannedBy: adminId,
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Invalidate all sessions
      await tx.session.deleteMany({ where: { userId } });
      await tx.activeSession.updateMany({
        where: { userId },
        data: { isValid: false, revokedAt: new Date(), revokedReason: "user_banned" },
      });
      await tx.refreshToken.updateMany({
        where: { userId },
        data: { isValid: false, revokedAt: new Date(), revokedReason: "user_banned" },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: "ADMIN_ACTION",
          category: "admin",
          entityType: "user",
          entityId: userId,
          description: `User banned: ${reason}`,
          performedBy: adminId,
        },
      });
    });

    return { success: true, message: "User banned successfully" };
  }

  /**
   * Unban user (admin)
   */
  static async unbanUser(userId: string, adminId: string) {
    await withTransaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          isBanned: false,
          banReason: null,
          bannedAt: null,
          bannedBy: null,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "ADMIN_ACTION",
          category: "admin",
          entityType: "user",
          entityId: userId,
          description: "User unbanned",
          performedBy: adminId,
        },
      });
    });

    return { success: true, message: "User unbanned successfully" };
  }

  /**
   * Update user role (admin)
   */
  static async updateUserRole(userId: string, role: string, adminId: string) {
    const validRoles = ["user", "admin"];
    if (!validRoles.includes(role)) {
      throw new Error("Invalid role");
    }

    await withTransaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          role,
          isAdmin: role === "admin",
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "ADMIN_ACTION",
          category: "admin",
          entityType: "user",
          entityId: userId,
          description: `User role changed to: ${role}`,
          performedBy: adminId,
        },
      });
    });

    return { success: true, message: "User role updated" };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function sanitizeTwitterHandle(handle: string): string {
  return handle.replace(/^@/, "").trim();
}

function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (password.length > 128) {
    errors.push("Password must be less than 128 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return errors;
}

function validateSettingsData(data: UpdateSettingsInput): string[] {
  const errors: string[] = [];

  if (data.theme && !["light", "dark", "system"].includes(data.theme)) {
    errors.push("Invalid theme value");
  }

  if (data.fontSize && !["small", "medium", "large"].includes(data.fontSize)) {
    errors.push("Invalid font size value");
  }

  if (data.timeFormat && !["12h", "24h"].includes(data.timeFormat)) {
    errors.push("Invalid time format value");
  }

  if (data.weekStartsOn !== undefined && (data.weekStartsOn < 0 || data.weekStartsOn > 6)) {
    errors.push("Week start day must be between 0 (Sunday) and 6 (Saturday)");
  }

  if (data.dataRetentionDays !== undefined && data.dataRetentionDays < 30) {
    errors.push("Data retention must be at least 30 days");
  }

  if (data.syncFrequency && !["realtime", "hourly", "daily", "manual"].includes(data.syncFrequency)) {
    errors.push("Invalid sync frequency value");
  }

  return errors;
}

function validateNotificationData(data: UpdateNotificationsInput): string[] {
  const errors: string[] = [];

  if (data.quietHoursStart && !/^\d{2}:\d{2}$/.test(data.quietHoursStart)) {
    errors.push("Invalid quiet hours start time format (use HH:MM)");
  }

  if (data.quietHoursEnd && !/^\d{2}:\d{2}$/.test(data.quietHoursEnd)) {
    errors.push("Invalid quiet hours end time format (use HH:MM)");
  }

  if (data.digestTime && !/^\d{2}:\d{2}$/.test(data.digestTime)) {
    errors.push("Invalid digest time format (use HH:MM)");
  }

  if (data.digestDay !== undefined && (data.digestDay < 0 || data.digestDay > 6)) {
    errors.push("Digest day must be between 0 (Sunday) and 6 (Saturday)");
  }

  if (data.digestFrequency && !["realtime", "daily", "weekly"].includes(data.digestFrequency)) {
    errors.push("Invalid digest frequency value");
  }

  return errors;
}

function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }

  return result;
}

// =============================================================================
// EXPORT
// =============================================================================

export default UserService;