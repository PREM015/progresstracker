import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class UserPlatformRepository {
    static async findMany(args: Prisma.UserPlatformFindManyArgs) {
        return prisma.userPlatform.findMany(args);
    }

    static async findUnique(args: Prisma.UserPlatformFindUniqueArgs) {
        return prisma.userPlatform.findUnique(args);
    }

    static async findFirst(args: Prisma.UserPlatformFindFirstArgs) {
        return prisma.userPlatform.findFirst(args);
    }

    static async update(args: Prisma.UserPlatformUpdateArgs) {
        return prisma.userPlatform.update(args);
    }

    static async count(args: Prisma.UserPlatformCountArgs) {
        return prisma.userPlatform.count(args);
    }
}
