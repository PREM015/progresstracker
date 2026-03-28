// src/repositories/account.repository.ts
// OAuth account data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class AccountRepository {
  static async findByProviderAndAccountId(
    provider: string,
    providerAccountId: string
  ) {
    return prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    });
  }

  static async findByUserId(userId: string) {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async create(data: Prisma.AccountCreateInput) {
    return prisma.account.create({ data });
  }

  static async deleteByProviderAndUser(provider: string, userId: string) {
    return prisma.account.deleteMany({ where: { provider, userId } });
  }

  static async countByUserId(userId: string) {
    return prisma.account.count({ where: { userId } });
  }

  static async getLinkedProviders(userId: string): Promise<string[]> {
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { provider: true },
    });
    return accounts.map((a) => a.provider);
  }
}

export default AccountRepository;
