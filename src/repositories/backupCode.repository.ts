// src/repositories/backupCode.repository.ts
// 2FA backup code data access

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class BackupCodeRepository {
  static async generateAndStore(userId: string, count = 10): Promise<string[]> {
    // Delete all existing backup codes
    await prisma.backupCode.deleteMany({ where: { userId } });

    const codes: string[] = [];
    const records = [];

    for (let i = 0; i < count; i++) {
      // e.g. XXXX-XXXX-XXXX
      const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
      const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
      codes.push(formatted);
      const codeHash = await bcrypt.hash(formatted.replace(/-/g, ''), 10);
      records.push({ userId, code: codeHash });
    }

    await prisma.backupCode.createMany({ data: records });
    return codes;
  }

  static async findUnusedByUserId(userId: string) {
    return prisma.backupCode.findMany({
      where: { userId, usedAt: null },
    });
  }

  static async countUnused(userId: string): Promise<number> {
    return prisma.backupCode.count({ where: { userId, usedAt: null } });
  }

  static async markUsed(id: string) {
    return prisma.backupCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  static async deleteAllForUser(userId: string) {
    return prisma.backupCode.deleteMany({ where: { userId } });
  }

  static async validateAndUse(userId: string, rawCode: string): Promise<boolean> {
    const cleanCode = rawCode.replace(/-/g, '').toUpperCase();
    const unusedCodes = await this.findUnusedByUserId(userId);

    for (const code of unusedCodes) {
      const match = await bcrypt.compare(cleanCode, code.code);
      if (match) {
        await this.markUsed(code.id);
        return true;
      }
    }
    return false;
  }
}

export default BackupCodeRepository;
