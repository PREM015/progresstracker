
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Diagnostics ---');

    const platformsCount = await prisma.platform.count();
    console.log(`Total platforms in DB: ${platformsCount}`);

    const leetcode = await prisma.platform.findFirst({
        where: {
            OR: [
                { id: 'leetcode' },
                { slug: 'leetcode' }
            ]
        }
    });

    if (leetcode) {
        console.log('LeetCode found:');
        console.log(JSON.stringify(leetcode, null, 2));
    } else {
        console.log('LeetCode NOT found in DB.');

        // Check for similar slugs
        const allSlugs = await prisma.platform.findMany({
            select: { slug: true, name: true }
        });
        console.log('Available slugs:', allSlugs.map(p => p.slug).join(', '));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
