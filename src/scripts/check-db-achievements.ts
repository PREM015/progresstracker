
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAchievements() {
    try {
        const count = await prisma.achievement.count();
        console.log(`Total Achievements in DB: ${count}`);

        if (count > 0) {
            const sample = await prisma.achievement.findMany({ take: 3 });
            console.log('Sample Achievements:', JSON.stringify(sample, null, 2));
        } else {
            console.log('No achievements found in the database. Seeding is required.');
        }
    } catch (error) {
        console.error('Error checking DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAchievements();
