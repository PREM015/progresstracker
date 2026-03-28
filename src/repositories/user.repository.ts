// src/repositories/user.repository.ts
// User data access

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export class UserRepository {
  static async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  static async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  }

  static async findByIdWithProfile(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        subscription: { where: { status: { in: ['ACTIVE', 'TRIALING'] } } },
      },
    });
  }

  static async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  static async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  }

  static async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  static async search(
    query: string,
    options?: { page?: number; limit?: number }
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { username: { contains: query, mode: 'insensitive' } },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  static async count() {
    return prisma.user.count();
  }

  static async markEmailVerified(id: string) {
    return prisma.user.update({
      where: { id },
      data: { emailVerified: new Date() },
    });
  }

  static async updateRole(id: string, role: string) {
    return prisma.user.update({ where: { id }, data: { role: role as any } });
  }

  static async isEmailTaken(email: string, excludeUserId?: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { email, id: excludeUserId ? { not: excludeUserId } : undefined },
      select: { id: true },
    });
    return !!user;
  }

  static async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { username, id: excludeUserId ? { not: excludeUserId } : undefined },
      select: { id: true },
    });
    return !!user;
  }
}

export default UserRepository;
