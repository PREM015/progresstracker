// ===== FILE: src/services/authService.ts (REPLACE) =====

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with settings in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split("@")[0],
        },
      });

      // Create default settings
      await tx.userSettings.create({
        data: {
          userId: newUser.id,
          theme: "system",
          autoSync: true,
          syncFrequency: "daily",
        },
      });

      // Create notification preferences
      await tx.notificationPreferences.create({
        data: {
          userId: newUser.id,
          emailNotifications: true,
          weeklyReport: true,
          achievementAlerts: true,
        },
      });

      return newUser;
    });

    return user;
  },

  /**
   * Verify user credentials
   */
  async verifyCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
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
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.password) {
      throw new Error("Cannot change password for OAuth-only users");
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  },
};