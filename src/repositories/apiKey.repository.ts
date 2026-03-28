// src/repositories/apiKey.repository.ts
// API key data access

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export class ApiKeyRepository {
  static async create(data: {
    userId: string;
    name: string;
    scopes: string[];
    expiresAt?: Date;
    allowedIps?: string[];
    rateLimit?: number;
  }) {
    const rawKey = `ptk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12); // ptk_xxxxxxxx

    const record = await prisma.apiKey.create({
      data: {
        userId: data.userId,
        name: data.name,
        keyHash,
        keyPrefix,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
        allowedIps: data.allowedIps ?? [],
        rateLimit: data.rateLimit ?? 1000,
      },
    });

    return { rawKey, record };
  }

  static async findById(id: string) {
    return prisma.apiKey.findUnique({ where: { id } });
  }

  static async findByHash(keyHash: string) {
    return prisma.apiKey.findUnique({ where: { keyHash } });
  }

  static async findValidByHash(keyHash: string) {
    return prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  static async findByUserId(userId: string, options?: { status?: string }) {
    return prisma.apiKey.findMany({
      where: {
        userId,
        ...(options?.status === 'active' ? { isActive: true } : {}),
        ...(options?.status === 'revoked' ? { isActive: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async revoke(id: string) {
    return prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
  }

  static async recordUsage(id: string) {
    return prisma.apiKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });
  }

  static async update(id: string, data: {
    name?: string;
    scopes?: string[];
    allowedIps?: string[];
    rateLimit?: number;
  }) {
    return prisma.apiKey.update({ where: { id }, data });
  }

  static async countByUserId(userId: string): Promise<number> {
    return prisma.apiKey.count({ where: { userId, isActive: true } });
  }
}

export default ApiKeyRepository;
