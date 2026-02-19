import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import fs from 'fs';

async function checkData() {
    console.log('--- STARTING DB CHECK ---');
    const output: any = {};
    try {
        console.log('Fetching audit logs...');
        const logs = await prisma.auditLog.findMany({
            take: 20,
            orderBy: { createdAt: 'desc' }
        });
        output.logs = logs;

        console.log('Fetching user connections...');
        const connections = await prisma.userPlatform.findMany({
            include: { platform: true },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });
        output.connections = connections;

        fs.writeFileSync('debug-db-output.json', JSON.stringify(output, null, 2));
        console.log('Output written to debug-db-output.json');
    } catch (err) {
        console.error('Error during data fetch:', err);
    }
}

checkData()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
