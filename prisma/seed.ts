import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'
import platforms from '../src/config/platforms'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // ===========================================
  // 1. CREATE DEMO USERS
  // ===========================================
  const hashedPassword = await bcrypt.hash('demo123', 10)

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@codesync.pro' },
    update: {},
    create: {
      email: 'demo@codesync.pro',
      name: 'Demo User',
      password: hashedPassword,
      image: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
  })

  console.log('✅ Created demo user:', demoUser.email)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@codesync.pro' },
    update: {},
    create: {
      email: 'admin@codesync.pro',
      name: 'Admin User',
      password: await bcrypt.hash('admin123', 10),
      image: 'https://avatars.githubusercontent.com/u/2?v=4',
    },
  })

  console.log('✅ Created admin user:', adminUser.email)

  // ===========================================
  // 2. SEED PLATFORMS (from config file)
  // ===========================================
  console.log('🌱 Seeding platforms from config...')

  for (const platformData of platforms) {
    await prisma.platform.upsert({
      where: { name: platformData.name },
      update: {
        slug: platformData.slug,
        category: platformData.category,
        icon: platformData.icon || '',
        color: platformData.color || '',
        website: platformData.website || '',
        authType: platformData.authType || '',
        supportsAutoSync: platformData.supportsAutoSync || false,
        description: platformData.description || '',
        displayName: platformData.displayName || platformData.name,
      },
      create: {
        id: platformData.id,
        name: platformData.name,
        slug: platformData.slug,
        category: platformData.category,
        icon: platformData.icon || '',
        color: platformData.color || '',
        website: platformData.website || '',
        authType: platformData.authType || '',
        supportsAutoSync: platformData.supportsAutoSync || false,
        description: platformData.description || '',
        displayName: platformData.displayName || platformData.name,
      },
    })
  }

  console.log(`✅ Seeded ${platforms.length} platforms`)

  // ===========================================
  // 3. SEED ACHIEVEMENTS
  // ===========================================
  const achievements = [
    {
      name: 'First Steps',
      description: 'Created your first tracker entry',
      icon: '🎯',
    },
    {
      name: 'Week Warrior',
      description: 'Tracked for 7 consecutive days',
      icon: '🔥',
    },
    {
      name: 'Month Master',
      description: 'Tracked for 30 consecutive days',
      icon: '📅',
    },
    {
      name: 'Century Club',
      description: 'Solved 100 DSA problems',
      icon: '💯',
    },
    {
      name: 'Problem Solver',
      description: 'Solved 500 DSA problems',
      icon: '🧩',
    },
    {
      name: 'Coding Machine',
      description: 'Solved 1000 DSA problems',
      icon: '🤖',
    },
    {
      name: 'Job Hunter',
      description: 'Applied to 50 jobs',
      icon: '🎯',
    },
    {
      name: 'Interview Pro',
      description: 'Applied to 100 jobs',
      icon: '💼',
    },
    {
      name: 'Learning Enthusiast',
      description: 'Completed 5 courses',
      icon: '📚',
    },
    {
      name: 'Learning Pro',
      description: 'Completed 10 courses',
      icon: '🎓',
    },
    {
      name: 'Hackathon Newbie',
      description: 'Participated in first hackathon',
      icon: '🏅',
    },
    {
      name: 'Hackathon Hero',
      description: 'Participated in 10 hackathons',
      icon: '🏆',
    },
  ]

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: {},
      create: achievement,
    })
  }

  console.log(`✅ Created ${achievements.length} achievements`)

  // ===========================================
  // 4. CREATE USER SETTINGS & PREFERENCES
  // ===========================================
  await prisma.userSettings.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      theme: 'dark',
      autoSync: true,
      syncFrequency: 'daily',
    },
  })

  await prisma.notificationPreferences.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      emailReminders: true,
      weeklySummary: true,
      achievementAlerts: true,
    },
  })

  console.log('✅ Created user settings and preferences')

  console.log('\n🎉 Seeding completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`   - Users: 2`)
  console.log(`   - Platforms: ${platforms.length}`)
  console.log(`   - Achievements: ${achievements.length}`)
  console.log('\n✅ Demo credentials:')
  console.log('   Email: demo@codesync.pro')
  console.log('   Password: demo123\n')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })