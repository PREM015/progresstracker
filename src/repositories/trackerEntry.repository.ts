import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class TrackerEntryRepository {
    static async findMany(args: Prisma.TrackerEntryFindManyArgs) {
        return prisma.trackerEntry.findMany(args);
    }

    static async create(args: Prisma.TrackerEntryCreateArgs) {
        return prisma.trackerEntry.create(args);
    }

    static async update(args: Prisma.TrackerEntryUpdateArgs) {
        return prisma.trackerEntry.update(args);
    }

    static async executeTransaction(operations: any[]) {
        return prisma.$transaction(operations);
    }
}
