// src/repositories/verificationToken.repository.ts
// NextAuth verification token data access

import { prisma } from '@/lib/prisma';

export class VerificationTokenRepository {
  static async create(data: {
    identifier: string;
    token: string;
    expires: Date;
  }) {
    return prisma.verificationToken.create({ data });
  }

  static async findByIdentifierAndToken(identifier: string, token: string) {
    return prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token } },
    });
  }

  static async delete(identifier: string, token: string) {
    return prisma.verificationToken.delete({
      where: { identifier_token: { identifier, token } },
    });
  }

  static async deleteExpired() {
    return prisma.verificationToken.deleteMany({
      where: { expires: { lt: new Date() } },
    });
  }

  static async deleteByIdentifier(identifier: string) {
    return prisma.verificationToken.deleteMany({ where: { identifier } });
  }
}

export default VerificationTokenRepository;
