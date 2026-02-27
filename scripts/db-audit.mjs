
import { PrismaClient } from '@prisma/client';

async function main() {
    console.log('--- DB AUDIT START ---');
    const prisma = new PrismaClient();
    console.log('Client initialized. Connecting...');

    try {
        await prisma.$connect();
        console.log('Connected successfully.\n');
        console.log('--- DATABASE INDEX AUDIT ---');

        console.log('\n1. Table Usage (Seq Scan vs Idx Scan)');
        const tableStats = await prisma.$queryRawUnsafe(`
      SELECT 
        relname AS table_name, 
        seq_scan, 
        idx_scan 
      FROM pg_stat_user_tables 
      WHERE seq_scan > 0
      ORDER BY seq_scan DESC;
    `);
        console.table(tableStats);

        console.log('\n2. Missing Foreign Key Indexes');
        const missingFkIndexes = await prisma.$queryRawUnsafe(`
      SELECT 
        conrelid::regclass AS table_name, 
        a.attname AS column_name
      FROM pg_constraint c 
      JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid 
      WHERE c.contype = 'f' 
      AND NOT EXISTS (
        SELECT 1 
        FROM pg_index i 
        WHERE i.indrelid = c.conrelid 
        AND a.attnum = ANY(i.indkey)
      );
    `);
        console.table(missingFkIndexes);

        console.log('\n3. High-Cost Queries (if pg_stat_statements enabled)');
        try {
            const topQueries = await prisma.$queryRawUnsafe(`
        SELECT 
          query, 
          calls, 
          total_exec_time, 
          mean_exec_time 
        FROM pg_stat_statements 
        ORDER BY mean_exec_time DESC 
        LIMIT 10;
      `);
            console.table(topQueries);
        } catch (e) {
            console.log('pg_stat_statements not enabled or accessible.');
        }

    } catch (error) {
        console.error('Error running audit:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
