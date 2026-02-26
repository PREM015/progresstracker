import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class SyncLogRepository {
    static async create(args: Prisma.SyncLogCreateArgs) {
        return prisma.syncLog.create(args);
    }

    static async update(args: Prisma.SyncLogUpdateArgs) {
        return prisma.syncLog.update(args);
    }

    static async findMany(args: Prisma.SyncLogFindManyArgs) {
        return prisma.syncLog.findMany(args);
    }

    static async count(args: Prisma.SyncLogCountArgs) {
        return prisma.syncLog.count(args);
    }

    static async findFirst(args: Prisma.SyncLogFindFirstArgs) {
        return prisma.syncLog.findFirst(args);
    }

    static async aggregate(args: Prisma.SyncLogAggregateArgs) {
        return prisma.syncLog.aggregate(args);
    }
}
