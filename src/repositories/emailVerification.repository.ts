// src/repositories/emailVerification.repository.ts
// Email verification data access

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export class EmailVerificationRepository {
  static async create(userId: string, email: string, expiryHours = 24) {
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await prisma.emailVerification.updateMany({
      where: { userId, verifiedAt: null },
      data: { verifiedAt: new Date() },
    });

    return prisma.emailVerification.create({
      data: { userId, email, token, expiresAt },
    });
  }

  static async findValidByToken(token: string) {
    return prisma.emailVerification.findFirst({
      where: { token, verifiedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  static async markVerified(id: string) {
    return prisma.emailVerification.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
  }

  static async deleteExpired() {
    return prisma.emailVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

export default EmailVerificationRepository;
