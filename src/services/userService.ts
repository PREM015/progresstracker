// src/services/userService.ts

import { prisma } from '@/lib/prisma';
import { hash, compare } from 'bcryptjs';
import type {
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UpdateNotificationsRequest,
  ChangePasswordRequest,
} from '@/types/settings';

export class UserService {
  /**
   * Get user profile with settings
   */
  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        notificationPreferences: true,
        _count: {
          select: {
            trackerEntries: true,
            goals: true,
            userAchievements: true,
            userPlatforms: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Don't return password hash
    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: UpdateProfileRequest) {
    // Check if email is being changed and if it's already taken
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Check if username is being changed and if it's already taken
    if (data.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new Error('Username already taken');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        username: data.username,
        bio: data.bio,
        avatar: data.avatar,
        location: data.location,
        website: data.website,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        avatar: true,
        location: true,
        website: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Update user settings
   */
  static async updateSettings(userId: string, data: UpdateSettingsRequest) {
    // Check if settings exist, create if not
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!existingSettings) {
      return await prisma.userSettings.create({
        data: {
          userId,
          ...data,
        },
      });
    }

    return await prisma.userSettings.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update notification preferences
   */
  static async updateNotifications(
    userId: string,
    data: UpdateNotificationsRequest
  ) {
    // Check if preferences exist, create if not
    const existingPrefs = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (!existingPrefs) {
      return await prisma.notificationPreferences.create({
        data: {
          userId,
          ...data,
        },
      });
    }

    return await prisma.notificationPreferences.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Change password
   */
  static async changePassword(userId: string, data: ChangePasswordRequest) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new Error('User not found or password not set');
    }

    // Verify current password
    const isValid = await compare(data.currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (data.newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Hash new password
    const hashedPassword = await hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Soft delete user account
   */
  static async deleteAccount(userId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new Error('User not found');
    }

    // Verify password
    const isValid = await compare(password, user.password);
    if (!isValid) {
      throw new Error('Incorrect password');
    }

    // Soft delete by marking email as deleted
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.com`,
        name: 'Deleted User',
        password: null,
        avatar: null,
        bio: null,
        location: null,
        website: null,
        updatedAt: new Date(),
      },
    });

    // Delete all sessions
    await prisma.session.deleteMany({
      where: { userId },
    });

    return { message: 'Account deleted successfully' };
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string) {
    const [
      totalEntries,
      totalGoals,
      completedGoals,
      achievements,
      platforms,
      currentStreak,
    ] = await Promise.all([
      prisma.trackerEntry.count({ where: { userId } }),
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.userAchievement.count({ where: { userId } }),
      prisma.userPlatform.count({ where: { userId, isActive: true } }),
      this.calculateCurrentStreak(userId),
    ]);

    return {
      totalEntries,
      totalGoals,
      completedGoals,
      achievements,
      platforms,
      currentStreak,
    };
  }

  /**
   * Calculate current streak
   */
  private static async calculateCurrentStreak(userId: string): Promise<number> {
    const entries = await prisma.trackerEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (entries.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}