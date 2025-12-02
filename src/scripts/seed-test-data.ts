// Add this at the very top of the file
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load environment variables from .env.local or .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import {prisma} from '@/lib/prisma';
import { subDays, startOfDay } from 'date-fns';

async function seedTestData() {
  console.log('🌱 Seeding test data for Phase 6...');

  // Get the first user (or create one)
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log('Creating test user...');
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword', // In production, use bcrypt
      },
    });
  }

  console.log(`✅ Using user: ${user.email} (ID: ${user.id})`);

  // Create tracker entries for the last 90 days
  console.log('Creating tracker entries...');
  const platforms = ['LeetCode', 'Codeforces', 'HackerRank', 'CodeChef', 'GitHub'];
  
  for (let i = 0; i < 90; i++) {
    const date = startOfDay(subDays(new Date(), i));
    const shouldSkip = Math.random() < 0.3; // 30% chance of no activity

    if (!shouldSkip) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const problems = Math.floor(Math.random() * 15) + 1; // 1-15 problems
      const timeSpent = Math.floor(Math.random() * 240) + 30; // 30-270 minutes

      await prisma.trackerEntry.create({
        data: {
          userId: user.id,
          date,
          platform,
          problems,
          timeSpent,
          notes: `Worked on ${platform} - ${problems} problems solved`,
        },
      });
    }
  }

  console.log('✅ Created 90 days of tracker entries');

  // Create some goals
  console.log('Creating goals...');
  
  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        title: 'Solve 100 LeetCode Problems',
        target: 100,
        progress: 45,
        deadline: new Date('2024-12-31'),
      },
      {
        userId: user.id,
        title: 'Complete DSA Course',
        target: 50,
        progress: 50,
        completedAt: new Date(),
      },
      {
        userId: user.id,
        title: 'Daily Coding for 30 Days',
        target: 30,
        progress: 12,
        deadline: subDays(new Date(), -20), // 20 days from now
      },
    ],
  });

  console.log('✅ Created 3 goals');

  // Create connected platforms
  console.log('Creating connected platforms...');
  
  const platformRecords = await prisma.platform.findMany({
    take: 5,
  });

  if (platformRecords.length > 0) {
    for (const platform of platformRecords) {
      await prisma.userPlatform.upsert({
        where: {
          userId_platformId: {
            userId: user.id,
            platformId: platform.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          platformId: platform.id,
          username: `testuser_${platform.slug}`,
        },
      });
    }
    console.log('✅ Connected 5 platforms');
  } else {
    console.log('⚠️  No platforms found in database. Run platform seeder first.');
  }

  console.log('\n🎉 Test data seeding complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   - User ID: ${user.id}`);
  console.log(`   - Tracker Entries: ~60-70 entries`);
  console.log(`   - Goals: 3 (1 completed, 2 active)`);
  console.log(`   - Connected Platforms: ${platformRecords.length}`);
  console.log(`\n✅ You can now test Phase 6!`);
}

seedTestData()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });