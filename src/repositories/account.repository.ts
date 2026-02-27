import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class AccountRepository {
    static async findFirst(args: Prisma.AccountFindFirstArgs) {
        return prisma.account.findFirst(args);
    }
}
