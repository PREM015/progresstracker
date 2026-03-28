import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class GoalRepository {
    static async findMany(args: Prisma.GoalFindManyArgs) { return prisma.goal.findMany(args); }
    static async findUnique(args: Prisma.GoalFindUniqueArgs) { return prisma.goal.findUnique(args); }
    static async create(args: Prisma.GoalCreateArgs) { return prisma.goal.create(args); }
    static async update(args: Prisma.GoalUpdateArgs) { return prisma.goal.update(args); }
}
