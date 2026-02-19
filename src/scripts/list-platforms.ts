
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const platforms = await prisma.platform.findMany({
            select: { id: true, slug: true, name: true, isActive: true }
        });

        console.log('--- Platform List ---');
        console.log(`Count: ${platforms.length}`);
        platforms.forEach(p => {
            console.log(`- ${p.name} (ID: ${p.id}, Slug: ${p.slug}, Active: ${p.isActive})`);
        });

        if (platforms.length === 0) {
            console.log('WARNING: Platform table is empty!');
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
