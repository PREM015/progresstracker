
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Attempt to query the table structure (PostgreSQL specific)
        const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'AuditLog';
    `;
        console.log('Columns in AuditLog table:', columns);
    } catch (error) {
        console.error('Error querying columns:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
