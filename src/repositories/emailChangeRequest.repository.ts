// src/repositories/emailChangeRequest.repository.ts
// Email change request data access

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export class EmailChangeRequestRepository {
  static async create(userId: string, currentEmail: string, newEmail: string, expiryHours = 24) {
    const oldEmailToken = crypto.randomBytes(48).toString('hex');
    const newEmailToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await prisma.emailChangeRequest.updateMany({
      where: { userId, completedAt: null },
      data: { cancelledAt: new Date() },
    });

    return prisma.emailChangeRequest.create({
      data: { userId, oldEmail: currentEmail, newEmail, oldEmailToken, newEmailToken, expiresAt },
    });
  }

  static async findValidByToken(token: string) {
    return prisma.emailChangeRequest.findFirst({
      where: {
        OR: [{ oldEmailToken: token }, { newEmailToken: token }],
        completedAt: null,
        cancelledAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  static async markConfirmed(id: string) {
    return prisma.emailChangeRequest.update({
      where: { id },
      data: { completedAt: new Date() },
    });
  }

  static async cancel(id: string) {
    return prisma.emailChangeRequest.update({
      where: { id },
      data: { cancelledAt: new Date() },
    });
  }

  static async deleteExpired() {
    return prisma.emailChangeRequest.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

export default EmailChangeRequestRepository;
