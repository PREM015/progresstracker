import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export const authService = {
  /**
   * Create a new user with hashed password
   */
  async createUser(email: string, password: string, name?: string) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split("@")[0], // Use email prefix as default name
      },
    });

    // Create default settings
    await this.createDefaultUserSettings(user.id);

    return user;
  },

  /**
   * Verify user credentials for login
   */
  async verifyCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return null; // User not found or OAuth-only user
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return null;
    }

    return user;
  },

  /**
   * Save OAuth tokens for platform syncing
   */
  async saveOAuthToken(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string | null,
    expiresAt?: number | null
  ) {
    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

    // Update or create account
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: userId,
        },
      },
      update: {
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
      },
      create: {
        userId,
        provider,
        providerAccountId: userId,
        type: "oauth",
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
      },
    });
  },

  /**
   * Create default settings and preferences for new users
   */
  async createDefaultUserSettings(userId: string) {
    // Create user settings
    await prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        theme: "light",
        autoSync: true,
        syncFrequency: "daily",
      },
    });

    // Create notification preferences
    await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        emailReminders: true,
        weeklySummary: true,
        achievementAlerts: true,
      },
    });
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
      },
    });
  },

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: { name?: string; image?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  },

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new Error("User not found or password not set");
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  },

  /**
   * Soft delete user account
   */
  async deleteUser(userId: string) {
    // Option 1: Hard delete (removes all data)
    // await prisma.user.delete({
    //   where: { id: userId },
    // });

    // Option 2: Soft delete (anonymize data)
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@deleted.com`,
        name: "Deleted User",
        password: null,
        image: null,
      },
    });
  },
};