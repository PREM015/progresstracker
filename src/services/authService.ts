// src/services/authService.ts
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ service: 'AuthService' });

/**
 * Helper: Normalize email
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Generate referral code
 */
function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export const authService = {
  /**
   * Create a new user with hashed password
   */
  async createUser(email: string, password: string, name?: string) {
    try {
      const normalizedEmail = normalizeEmail(email);

      if (!password || password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new Error("User already exists with this email");
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            password: hashedPassword,
            name: name || normalizedEmail.split("@")[0],
            referralCode: generateReferralCode(),
          },
        });

        await tx.userSettings.create({
          data: {
            userId: newUser.id,
            theme: "system",
            autoSync: true,
            syncFrequency: "daily",
          },
        });

        await tx.notificationPreferences.create({
          data: {
            userId: newUser.id,
            enabled: true,
            emailEnabled: true,
            pushEnabled: true,
            inAppEnabled: true,
            weeklyReport: true,
            achievementAlerts: true,
          },
        });

        return newUser;
      });

      log.info('User created', { userId: user.id, email: normalizedEmail });

      return user;
    } catch (error) {
      log.error('Error creating user', { email }, error);
      throw error;
    }
  },

  /**
   * Verify user credentials
   */
  async verifyCredentials(email: string, password: string) {
    try {
      const normalizedEmail = normalizeEmail(email);

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          image: true,
          isActive: true,
          isBanned: true,
          banReason: true,
          role: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          referralCode: true,
        },
      });

      if (!user || !user.password) {
        log.warn('User not found or no password', { email: normalizedEmail });
        return null;
      }

      if (!user.isActive) {
        log.warn('Account deactivated', { userId: user.id });
        throw new Error("Account is deactivated");
      }

      if (user.isBanned) {
        log.warn('Account banned', { userId: user.id });
        throw new Error(
          `Account is banned: ${user.banReason || "Policy violation"}`
        );
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        log.warn('Invalid password', { email: normalizedEmail });
        return null;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });

      log.info('User verified successfully', { userId: user.id });

      return user;
    } catch (error) {
      log.error('Error verifying credentials', { email }, error);
      throw error;
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          createdAt: true,
        },
      });

      if (user) {
        log.info('User fetched by ID', { userId });
      }

      return user;
    } catch (error) {
      log.error('Error fetching user by ID', { userId }, error);
      throw error;
    }
  },

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
      });

      if (!user?.password) {
        throw new Error("Cannot change password for OAuth-only users");
      }

      if (!newPassword || newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters");
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw new Error("Current password is incorrect");
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { 
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      });

      log.info('Password changed', { userId });
    } catch (error) {
      log.error('Error changing password', { userId }, error);
      throw error;
    }
  },
};

export default authService;