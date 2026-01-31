// ===== FILE: src/services/authService.ts (REPLACE FULL) =====

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Helper: Normalize email
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export const authService = {
  /**
   * Create a new user with hashed password
   * - Checks existing user
   * - Normalizes email
   * - Validates password strength
   * - Creates user + settings + notificationPreferences in transaction
   */
  async createUser(email: string, password: string, name?: string) {
    // ✅ Normalize email
    const normalizedEmail = normalizeEmail(email);

    // ✅ Validate password strength
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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
          email: normalizedEmail,
          password: hashedPassword,
          name: name || normalizedEmail.split("@")[0],

          /**
           * ✅ Added from FIXED version
           * NOTE: If Prisma User model doesn't have referralCode -> remove/comment this line
           */
          // referralCode: generateReferralCode(),
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

      // Create notification preferences (MERGED + FIXED)
      await tx.notificationPreferences.create({
        data: {
          userId: newUser.id,

          // ✅ Preferences
          enabled: true,
          emailEnabled: true,
          pushEnabled: true, // (your first code had true)
          inAppEnabled: true,

          // ✅ Alerts
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
   * - Normalizes email
   * - Checks password
   * - Checks isActive + isBanned
   * - Updates lastLoginAt
   */
  async verifyCredentials(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }, // ✅ Normalize email
      select: {
        // identity
        id: true,
        email: true,
        password: true,
        name: true,
        image: true,

        // status
        isActive: true,
        isBanned: true,
        banReason: true,

        // role/admin
        role: true,
        isAdmin: true,

        // timestamps
        createdAt: true,
        updatedAt: true,

        
        
         lastLoginAt: true,
         referralCode: true,
         
      },
    });

    // ✅ If user doesn't exist OR password missing (OAuth only)
    if (!user || !user.password) {
      return null;
    }

    // ✅ Check account status (from FIXED code)
    if (!user.isActive) {
      throw new Error("Account is deactivated");
    }

    if (user.isBanned) {
      throw new Error(
        `Account is banned: ${user.banReason || "Policy violation"}`
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }

    /**
     * ✅ Update last login (from FIXED code)
     * NOTE: requires `lastLoginAt` field in Prisma schema.
     * If it doesn't exist -> remove/comment this block.
     */
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return user;
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
   * - Works only for password users (not OAuth-only)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user?.password) {
      throw new Error("Cannot change password for OAuth-only users");
    }

    // Validate new password
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
      data: { password: hashedPassword },
    });
  },
};
