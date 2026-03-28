// src/repositories/emailTemplate.repository.ts
// Email template data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class EmailTemplateRepository {
  static async findAll(options?: { category?: string; status?: string }) {
    return prisma.emailTemplate.findMany({
      where: {
        ...(options?.category ? { category: options.category as never } : {}),
        ...(options?.status ? { status: options.status as never } : {}),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  static async findBySlug(slug: string) {
    return prisma.emailTemplate.findUnique({ where: { slug } });
  }

  static async findById(id: string) {
    return prisma.emailTemplate.findUnique({ where: { id } });
  }

  static async create(data: Prisma.EmailTemplateCreateInput) {
    return prisma.emailTemplate.create({ data });
  }

  static async update(id: string, data: Prisma.EmailTemplateUpdateInput) {
    return prisma.emailTemplate.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.emailTemplate.delete({ where: { id } });
  }

  static async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const t = await prisma.emailTemplate.findFirst({
      where: { slug, id: excludeId ? { not: excludeId } : undefined },
      select: { id: true },
    });
    return !!t;
  }
}

export default EmailTemplateRepository;
