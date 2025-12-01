import { PrismaClient } from '../src/generated/prisma/index'
import bcrypt from 'bcryptjs'
import 'dotenv/config' 
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
  // 2. SEED PLATFORMS (50+ PLATFORMS)
  // ===========================================
  const platforms = [
    // ========== DSA PLATFORMS (15) ==========
    {
      name: 'LeetCode',
      category: 'DSA',
      icon: '💻',
    },
    {
      name: 'Codeforces',
      category: 'DSA',
      icon: '🎯',
    },
    {
      name: 'CodeChef',
      category: 'DSA',
      icon: '👨‍🍳',
    },
    {
      name: 'HackerRank',
      category: 'DSA',
      icon: '🏆',
    },
    {
      name: 'AtCoder',
      category: 'DSA',
      icon: '⚡',
    },
    {
      name: 'TopCoder',
      category: 'DSA',
      icon: '🥇',
    },
    {
      name: 'GeeksforGeeks',
      category: 'DSA',
      icon: '🤓',
    },
    {
      name: 'HackerEarth',
      category: 'DSA',
      icon: '🌍',
    },
    {
      name: 'CodeSignal',
      category: 'DSA',
      icon: '📊',
    },
    {
      name: 'Exercism',
      category: 'DSA',
      icon: '💪',
    },
    {
      name: 'Project Euler',
      category: 'DSA',
      icon: '🧮',
    },
    {
      name: 'SPOJ',
      category: 'DSA',
      icon: '🔢',
    },
    {
      name: 'InterviewBit',
      category: 'DSA',
      icon: '🎤',
    },
    {
      name: 'Codewars',
      category: 'DSA',
      icon: '⚔️',
    },
    {
      name: 'AlgoExpert',
      category: 'DSA',
      icon: '🧠',
    },

    // ========== DEVELOPMENT PLATFORMS (10) ==========
    {
      name: 'GitHub',
      category: 'DEVELOPMENT',
      icon: '🐙',
    },
    {
      name: 'GitLab',
      category: 'DEVELOPMENT',
      icon: '🦊',
    },
    {
      name: 'Bitbucket',
      category: 'DEVELOPMENT',
      icon: '🪣',
    },
    {
      name: 'Stack Overflow',
      category: 'DEVELOPMENT',
      icon: '📚',
    },
    {
      name: 'Dev.to',
      category: 'DEVELOPMENT',
      icon: '📝',
    },
    {
      name: 'Hashnode',
      category: 'DEVELOPMENT',
      icon: '✍️',
    },
    {
      name: 'Medium',
      category: 'DEVELOPMENT',
      icon: 'M',
    },
    {
      name: 'Replit',
      category: 'DEVELOPMENT',
      icon: '🔄',
    },
    {
      name: 'CodeSandbox',
      category: 'DEVELOPMENT',
      icon: '📦',
    },
    {
      name: 'npm',
      category: 'DEVELOPMENT',
      icon: '📦',
    },

    // ========== JOB PLATFORMS (12) ==========
    {
      name: 'LinkedIn',
      category: 'JOBS',
      icon: '💼',
    },
    {
      name: 'Naukri',
      category: 'JOBS',
      icon: '🇮🇳',
    },
    {
      name: 'Internshala',
      category: 'JOBS',
      icon: '🎓',
    },
    {
      name: 'Indeed',
      category: 'JOBS',
      icon: '🔍',
    },
    {
      name: 'AngelList',
      category: 'JOBS',
      icon: '👼',
    },
    {
      name: 'Glassdoor',
      category: 'JOBS',
      icon: '🚪',
    },
    {
      name: 'Monster',
      category: 'JOBS',
      icon: '👹',
    },
    {
      name: 'Dice',
      category: 'JOBS',
      icon: '🎲',
    },
    {
      name: 'ZipRecruiter',
      category: 'JOBS',
      icon: '📧',
    },
    {
      name: 'Wellfound (AngelList)',
      category: 'JOBS',
      icon: '🚀',
    },
    {
      name: 'Hired',
      category: 'JOBS',
      icon: '✅',
    },
    {
      name: 'Remote.co',
      category: 'JOBS',
      icon: '🌐',
    },

    // ========== LEARNING PLATFORMS (10) ==========
    {
      name: 'Coursera',
      category: 'LEARNING',
      icon: '🎓',
    },
    {
      name: 'Udemy',
      category: 'LEARNING',
      icon: '📚',
    },
    {
      name: 'edX',
      category: 'LEARNING',
      icon: '🏫',
    },
    {
      name: 'Pluralsight',
      category: 'LEARNING',
      icon: '🎬',
    },
    {
      name: 'LinkedIn Learning',
      category: 'LEARNING',
      icon: '🎓',
    },
    {
      name: 'Udacity',
      category: 'LEARNING',
      icon: '🚗',
    },
    {
      name: 'FreeCodeCamp',
      category: 'LEARNING',
      icon: '🔥',
    },
    {
      name: 'Codecademy',
      category: 'LEARNING',
      icon: '🎮',
    },
    {
      name: 'Khan Academy',
      category: 'LEARNING',
      icon: '🌳',
    },
    {
      name: 'Scrimba',
      category: 'LEARNING',
      icon: '🎬',
    },

    // ========== HACKATHON PLATFORMS (8) ==========
    {
      name: 'Devpost',
      category: 'HACKATHONS',
      icon: '🏅',
    },
    {
      name: 'MLH',
      category: 'HACKATHONS',
      icon: '🎉',
    },
    {
      name: 'Devfolio',
      category: 'HACKATHONS',
      icon: '📱',
    },
    {
      name: 'HackerEarth Hackathons',
      category: 'HACKATHONS',
      icon: '🌍',
    },
    {
      name: 'Unstop',
      category: 'HACKATHONS',
      icon: '🔴',
    },
    {
      name: 'Kaggle',
      category: 'HACKATHONS',
      icon: '📊',
    },
    {
      name: 'ChallengeRocket',
      category: 'HACKATHONS',
      icon: '🚀',
    },
    {
      name: 'HackClub',
      category: 'HACKATHONS',
      icon: '🎪',
    },

    // ========== OTHER PLATFORMS (5) ==========
    {
      name: 'Behance',
      category: 'DESIGN',
      icon: '🎨',
    },
    {
      name: 'Dribbble',
      category: 'DESIGN',
      icon: '🏀',
    },
    {
      name: 'Figma Community',
      category: 'DESIGN',
      icon: '🎨',
    },
    {
      name: 'ProductHunt',
      category: 'PRODUCTS',
      icon: '🦄',
    },
    {
      name: 'IndieHackers',
      category: 'PRODUCTS',
      icon: '🛠️',
    },
  ]

  for (const platform of platforms) {
    await prisma.platform.upsert({
      where: { name: platform.name },
      update: {},
      create: platform,
    })
  }

  console.log(`✅ Created ${platforms.length} platforms`)

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
    {
      name: 'Git Champion',
      description: 'Made 100 GitHub commits',
      icon: '🐙',
    },
    {
      name: 'Open Source Contributor',
      description: 'Made 50 contributions',
      icon: '🌟',
    },
    {
      name: 'Time Tracker',
      description: 'Logged 100 hours of coding',
      icon: '⏰',
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

  // ===========================================
  // 5. CONNECT DEMO USER TO PLATFORMS
  // ===========================================
  const leetcode = await prisma.platform.findFirst({ where: { name: 'LeetCode' } })
  const github = await prisma.platform.findFirst({ where: { name: 'GitHub' } })
  const linkedin = await prisma.platform.findFirst({ where: { name: 'LinkedIn' } })

  if (leetcode) {
    await prisma.userPlatform.upsert({
      where: { userId_platformId: { userId: demoUser.id, platformId: leetcode.id } },
      update: {},
      create: {
        userId: demoUser.id,
        platformId: leetcode.id,
        username: 'demo_user',
      },
    })
  }

  if (github) {
    await prisma.userPlatform.upsert({
      where: { userId_platformId: { userId: demoUser.id, platformId: github.id } },
      update: {},
      create: {
        userId: demoUser.id,
        platformId: github.id,
        username: 'demouser',
      },
    })
  }

  if (linkedin) {
    await prisma.userPlatform.upsert({
      where: { userId_platformId: { userId: demoUser.id, platformId: linkedin.id } },
      update: {},
      create: {
        userId: demoUser.id,
        platformId: linkedin.id,
        username: 'demo-user',
      },
    })
  }

  console.log('✅ Connected demo user to 3 platforms')

  // ===========================================
  // 6. CREATE SAMPLE TRACKER ENTRIES (30 days)
  // ===========================================
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const entryDate = new Date(today)
    entryDate.setDate(today.getDate() - i)

    await prisma.trackerEntry.create({
      data: {
        userId: demoUser.id,
        date: entryDate,
        platform: i % 3 === 0 ? 'LeetCode' : i % 3 === 1 ? 'GitHub' : 'LinkedIn',
        problems: Math.floor(Math.random() * 5) + 1,
        timeSpent: Math.floor(Math.random() * 180) + 30, // 30-210 minutes
        notes: i % 5 === 0 ? 'Had a productive day!' : null,
      },
    })
  }

  console.log('✅ Created 30 sample tracker entries')

  // ===========================================
  // 7. CREATE SAMPLE GOALS
  // ===========================================
  await prisma.goal.create({
    data: {
      userId: demoUser.id,
      title: 'Solve 100 LeetCode problems',
      target: 100,
      progress: 45,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  })

  await prisma.goal.create({
    data: {
      userId: demoUser.id,
      title: 'Apply to 50 jobs',
      target: 50,
      progress: 20,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    },
  })

  await prisma.goal.create({
    data: {
      userId: demoUser.id,
      title: 'Complete 5 courses',
      target: 5,
      progress: 5,
      completedAt: new Date(),
    },
  })

  console.log('✅ Created 3 sample goals')

  // ===========================================
  // 8. UNLOCK ACHIEVEMENTS FOR DEMO USER
  // ===========================================
  const firstSteps = await prisma.achievement.findFirst({ where: { name: 'First Steps' } })
  const weekWarrior = await prisma.achievement.findFirst({ where: { name: 'Week Warrior' } })

  if (firstSteps) {
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: demoUser.id,
          achievementId: firstSteps.id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        achievementId: firstSteps.id,
      },
    })
  }

  if (weekWarrior) {
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: demoUser.id,
          achievementId: weekWarrior.id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        achievementId: weekWarrior.id,
      },
    })
  }

  console.log('✅ Unlocked 2 achievements for demo user')

  // ===========================================
  // 9. CREATE SAMPLE SYNC LOGS
  // ===========================================
  await prisma.syncLog.create({
    data: {
      userId: demoUser.id,
      platformId: leetcode?.id,
      status: 'SUCCESS',
      message: 'Successfully synced LeetCode data',
    },
  })

  await prisma.syncLog.create({
    data: {
      userId: demoUser.id,
      platformId: github?.id,
      status: 'SUCCESS',
      message: 'Successfully synced GitHub data',
    },
  })

  console.log('✅ Created 2 sync logs')

  console.log('\n🎉 Seeding completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`   - Users: 2 (demo@codesync.pro, admin@codesync.pro)`)
  console.log(`   - Platforms: ${platforms.length}`)
  console.log(`   - Achievements: ${achievements.length}`)
  console.log(`   - Tracker Entries: 30`)
  console.log(`   - Goals: 3`)
  console.log(`   - User Achievements: 2`)
  console.log(`   - Sync Logs: 2`)
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