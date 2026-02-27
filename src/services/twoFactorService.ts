// src/services/twoFactorService.ts


import { prisma } from '@/lib/prisma';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { decrypt, encrypt } from '@/lib/encryption';

// =============================================================================
// TYPES
// =============================================================================

export interface TwoFactorSetupData {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  isPending: boolean;
  hasBackupCodes: boolean;
  backupCodesRemaining: number;
  lastUsedAt: Date | null;
  verifiedAt: Date | null;
}

export interface VerifyResult {
  success: boolean;
  error?: string;
}

// =============================================================================
// TWO FACTOR SERVICE
// =============================================================================

export class TwoFactorService {
  private static readonly APP_NAME = 'Progress Tracker';
  private static readonly BACKUP_CODES_COUNT = 10;

  // ===========================================================================
  // SETUP 2FA
  // ===========================================================================

  /**
   * Initialize 2FA setup - generates secret and QR code
   */
  static async initiate2FASetup(userId: string): Promise<TwoFactorSetupData> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || !user.email) {
      throw new Error('User not found');
    }

    // Check if already has 2FA enabled
    const existing = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (existing?.isEnabled) {
      throw new Error('2FA is already enabled');
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate OTP auth URL
    const otpauthUrl = authenticator.keyuri(
      user.email,
      this.APP_NAME,
      secret
    );

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    const encryptedSecret = encrypt(secret);

    // Store pending 2FA setup
    await prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        secret: encryptedSecret,
        isEnabled: false,
        isPending: true,
      },
      update: {
        secret: encryptedSecret,
        isEnabled: false,
        isPending: true,
        verifiedAt: null,
      },
    });

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      backupCodes,
    };
  }

  /**
   * Complete 2FA setup by verifying first token
   */
  static async complete2FASetup(
    userId: string,
    token: string,
    backupCodes: string[]
  ): Promise<{ success: boolean; error?: string }> {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.isPending) {
      return { success: false, error: '2FA setup not initiated' };
    }

    // Verify the token
    const decryptedSecret = decrypt(twoFactor.secret);
    const isValid = authenticator.verify({
      token,
      secret: decryptedSecret,
    });

    if (!isValid) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Hash and store backup codes
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(async (code) => {
        return {
          userId,
          code: await bcrypt.hash(code, 10),
        };
      })
    );

    // Transaction: Enable 2FA and store backup codes
    await prisma.$transaction([
      prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          isEnabled: true,
          isPending: false,
          verifiedAt: new Date(),
        },
      }),
      prisma.backupCode.deleteMany({ where: { userId } }),
      prisma.backupCode.createMany({ data: hashedBackupCodes }),
    ]);

    return { success: true };
  }

  // ===========================================================================
  // VERIFY 2FA
  // ===========================================================================

  /**
   * Verify a TOTP token
   */
  static async verifyToken(
    userId: string,
    token: string
  ): Promise<VerifyResult> {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.isEnabled) {
      return { success: false, error: '2FA is not enabled' };
    }

    const decryptedSecret = decrypt(twoFactor.secret);
    const isValid = authenticator.verify({
      token,
      secret: decryptedSecret,
    });

    if (isValid) {
      // Update last used
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });

      return { success: true };
    }

    return { success: false, error: 'Invalid verification code' };
  }

  /**
   * Verify a backup code
   */
  static async verifyBackupCode(
    userId: string,
    code: string,
    ipAddress?: string
  ): Promise<VerifyResult> {
    const backupCodes = await prisma.backupCode.findMany({
      where: {
        userId,
        usedAt: null,
      },
    });

    for (const backupCode of backupCodes) {
      const isMatch = await bcrypt.compare(code, backupCode.code);

      if (isMatch) {
        // Mark as used
        await prisma.backupCode.update({
          where: { id: backupCode.id },
          data: {
            usedAt: new Date(),
            usedIpAddress: ipAddress,
          },
        });

        // Update 2FA last used
        await prisma.twoFactorAuth.update({
          where: { userId },
          data: { lastUsedAt: new Date() },
        });

        return { success: true };
      }
    }

    return { success: false, error: 'Invalid backup code' };
  }

  /**
   * Verify either TOTP or backup code
   */
  static async verify(
    userId: string,
    code: string,
    ipAddress?: string
  ): Promise<VerifyResult> {
    // Try TOTP first (6 digits)
    if (/^\d{6}$/.test(code)) {
      const totpResult = await this.verifyToken(userId, code);
      if (totpResult.success) return totpResult;
    }

    // Try backup code
    return this.verifyBackupCode(userId, code, ipAddress);
  }

  // ===========================================================================
  // STATUS & INFO
  // ===========================================================================

  /**
   * Get 2FA status for a user
   */
  static async getStatus(userId: string): Promise<TwoFactorStatus> {
    const [twoFactor, backupCodesCount] = await Promise.all([
      prisma.twoFactorAuth.findUnique({
        where: { userId },
      }),
      prisma.backupCode.count({
        where: { userId, usedAt: null },
      }),
    ]);

    return {
      isEnabled: twoFactor?.isEnabled ?? false,
      isPending: twoFactor?.isPending ?? false,
      hasBackupCodes: backupCodesCount > 0,
      backupCodesRemaining: backupCodesCount,
      lastUsedAt: twoFactor?.lastUsedAt ?? null,
      verifiedAt: twoFactor?.verifiedAt ?? null,
    };
  }

  /**
   * Check if user has 2FA enabled
   */
  static async is2FAEnabled(userId: string): Promise<boolean> {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { isEnabled: true },
    });

    return twoFactor?.isEnabled ?? false;
  }

  /**
   * Check if user requires 2FA verification
   */
  static async requires2FA(userId: string): Promise<boolean> {
    return this.is2FAEnabled(userId);
  }

  // ===========================================================================
  // DISABLE 2FA
  // ===========================================================================

  /**
   * Disable 2FA for a user
   */
  static async disable2FA(
    userId: string,
    verificationCode: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verify the code first
    const verifyResult = await this.verify(userId, verificationCode);

    if (!verifyResult.success) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Disable 2FA and remove backup codes
    await prisma.$transaction([
      prisma.twoFactorAuth.delete({ where: { userId } }),
      prisma.backupCode.deleteMany({ where: { userId } }),
    ]);

    return { success: true };
  }

 /**
 * Force disable 2FA (admin use or recovery)
 */
static async forceDisable2FA(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // deleteMany safe hai: record ho ya na ho, error nahi deta
    await tx.twoFactorAuth.deleteMany({ where: { userId } });

    await tx.backupCode.deleteMany({ where: { userId } });
  });
}

  // ===========================================================================
  // BACKUP CODES
  // ===========================================================================

  /**
   * Generate new backup codes
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Format: XXXX-XXXX (8 alphanumeric characters)
      const code = `${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;
      codes.push(code);
    }

    return codes;
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(
    userId: string,
    verificationCode: string
  ): Promise<{ success: boolean; codes?: string[]; error?: string }> {
    // Verify the code first
    const verifyResult = await this.verify(userId, verificationCode);

    if (!verifyResult.success) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Generate new codes
    const newCodes = this.generateBackupCodes();

    // Hash and store
    const hashedCodes = await Promise.all(
      newCodes.map(async (code) => ({
        userId,
        code: await bcrypt.hash(code, 10),
      }))
    );

    await prisma.$transaction([
      prisma.backupCode.deleteMany({ where: { userId } }),
      prisma.backupCode.createMany({ data: hashedCodes }),
    ]);

    return { success: true, codes: newCodes };
  }

  /**
   * Get remaining backup codes count
   */
  static async getBackupCodesCount(userId: string): Promise<number> {
    return prisma.backupCode.count({
      where: { userId, usedAt: null },
    });
  }

  // ===========================================================================
  // RECOVERY
  // ===========================================================================

  /**
   * Set recovery email
   */
  static async setRecoveryEmail(
    userId: string,
    email: string,
    verificationCode: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verify the code first
    const verifyResult = await this.verify(userId, verificationCode);

    if (!verifyResult.success) {
      return { success: false, error: 'Invalid verification code' };
    }

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { recoveryEmail: email },
    });

    return { success: true };
  }

  /**
   * Set recovery phone
   */
  static async setRecoveryPhone(
    userId: string,
    phone: string,
    verificationCode: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verify the code first
    const verifyResult = await this.verify(userId, verificationCode);

    if (!verifyResult.success) {
      return { success: false, error: 'Invalid verification code' };
    }

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { recoveryPhone: phone },
    });

    return { success: true };
  }
}

export default TwoFactorService;
