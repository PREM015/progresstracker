// src/services/backupCodeService.ts
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const log = logger.child({ service: 'BackupCodeService' });

/**
 * Generate backup codes for 2FA recovery
 */
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = `${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;
    codes.push(code);
  }
  return codes;
}

class BackupCodeService {
  /**
   * Generate new backup codes
   */
  async generate(userId: string): Promise<string[]> {
    try {
      const codes = generateBackupCodes(10);

      const hashedCodes = await Promise.all(
        codes.map(async (code) => ({
          userId,
          code: await bcrypt.hash(code, 10),
        }))
      );

      await prisma.$transaction([
        prisma.backupCode.deleteMany({ where: { userId } }),
        prisma.backupCode.createMany({ data: hashedCodes }),
      ]);

      log.info('Backup codes generated', { userId, count: codes.length });

      return codes;
    } catch (error) {
      log.error('Error generating backup codes', { userId }, error);
      throw error;
    }
  }

  /**
   * Verify a backup code
   */
  async verify(userId: string, code: string, ipAddress?: string): Promise<boolean> {
    try {
      const backupCodes = await prisma.backupCode.findMany({
        where: { userId, usedAt: null },
      });

      for (const backupCode of backupCodes) {
        const isMatch = await bcrypt.compare(code, backupCode.code);

        if (isMatch) {
          await prisma.backupCode.update({
            where: { id: backupCode.id },
            data: {
              usedAt: new Date(),
              usedIpAddress: ipAddress,
            },
          });

          log.info('Backup code verified', { userId, backupCodeId: backupCode.id });

          return true;
        }
      }

      log.warn('Invalid backup code', { userId });

      return false;
    } catch (error) {
      log.error('Error verifying backup code', { userId }, error);
      throw error;
    }
  }

  /**
   * Get remaining backup codes count
   */
  async getRemainingCount(userId: string): Promise<number> {
    try {
      const count = await prisma.backupCode.count({
        where: { userId, usedAt: null },
      });

      log.info('Backup codes count fetched', { userId, count });

      return count;
    } catch (error) {
      log.error('Error getting backup codes count', { userId }, error);
      throw error;
    }
  }

  /**
   * Delete all backup codes for user
   */
  async deleteAll(userId: string): Promise<void> {
    try {
      await prisma.backupCode.deleteMany({ where: { userId } });

      log.info('All backup codes deleted', { userId });
    } catch (error) {
      log.error('Error deleting backup codes', { userId }, error);
      throw error;
    }
  }
}

export const backupCodeService = new BackupCodeService();
export default backupCodeService;