// src/repositories/shareLink.repository.ts
// Share link data access

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export class ShareLinkRepository {
  static async findByUserId(userId: string, options?: { type?: string; isActive?: boolean }) {
    return prisma.shareLink.findMany({
      where: {
        userId,
        ...(options?.type ? { entityType: options.type as any } : {}),
        ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findById(id: string) {
    return prisma.shareLink.findUnique({ where: { id } });
  }

  static async findBySlug(slug: string) {
    return prisma.shareLink.findFirst({ where: { code: slug } });
  }

  static async create(data: {
    userId: string;
    type: string;
    title?: string;
    description?: string;
    isPublic?: boolean;
    password?: string;
    allowedViews?: number;
    expiresAt?: Date;
    customization?: unknown;
    includedData?: unknown;
  }) {
    const code = crypto.randomBytes(8).toString('base64url');
    const { type, allowedViews, customization, includedData, ...rest } = data;
    return prisma.shareLink.create({ 
      data: { 
        ...rest, 
        entityType: type as any, 
        code, 
        maxViews: allowedViews, 
        customStyles: customization as any 
      } 
    });
  }

  static async update(id: string, data: Record<string, unknown>) {
    return prisma.shareLink.update({ where: { id }, data });
  }

  static async incrementViews(id: string) {
    return prisma.shareLink.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  }

  static async revoke(id: string) {
    return prisma.shareLink.update({ where: { id }, data: { isActive: false, revokedAt: new Date() } });
  }

  static async delete(id: string) {
    return prisma.shareLink.delete({ where: { id } });
  }

  static async checkPassword(id: string, password: string): Promise<boolean> {
    const link = await prisma.shareLink.findUnique({
      where: { id },
      select: { password: true },
    });
    return link?.password === password;
  }
}

export default ShareLinkRepository;
