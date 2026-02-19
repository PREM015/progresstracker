
import { prisma } from '../lib/prisma';

async function main() {
    console.log('Boosting subscription limits for all users...');

    const result = await prisma.subscription.updateMany({
        data: {
            platformLimit: 100, // High limit for testing
            apiRequestsDaily: 1000,
        },
    });

    console.log(`Updated ${result.count} subscriptions.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
