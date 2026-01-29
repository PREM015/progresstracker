// prisma/seed.ts
import { PrismaClient, PlatformCategory, AuthType, GoalType, GoalMetric, GoalStatus, NotificationType, NotificationChannel, NotificationPriority, SubscriptionTier, SyncStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (optional - comment out in production)
  await clearDatabase();

  // Seed in order of dependencies
  await seedPlatforms();
  await seedUsers();
  await seedUserPlatforms();
  await seedTrackerEntries();
  await seedGoals();
  await seedAchievements();
  await seedNotifications();
  await seedGoalTemplates();
  await seedFeatureFlags();
  await seedSystemSettings();

  console.log('✅ Database seeding completed successfully!');
}

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  // Delete in reverse order of dependencies
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.goalReminder.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.trackerEntry.deleteMany();
  await prisma.dailyStats.deleteMany();
  await prisma.streakHistory.deleteMany();
  await prisma.userPlatform.deleteMany();
  await prisma.customPlatform.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.goalTemplate.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.systemSettings.deleteMany();
  
  console.log('✨ Database cleared');
}

async function seedPlatforms() {
  console.log('📦 Seeding platforms...');

  const platforms = [
    {
      slug: 'leetcode',
      name: 'LeetCode',
      displayName: 'LeetCode',
      description: 'The world\'s leading online programming learning platform',
      category: PlatformCategory.DSA,
      authType: AuthType.SCRAPING,
      icon: '🎯',
      logo: '/logos/leetcode.png',
      color: '#FFA116',
      backgroundColor: '#FFF5E6',
      website: 'https://leetcode.com',
      apiEndpoint: 'https://leetcode.com/api',
      profileUrlPattern: 'https://leetcode.com/{username}',
      supportsAutoSync: true,
      supportsWebhook: false,
      supportsOAuth: false,
      supportsApiKey: false,
      requiresCredentials: true,
      syncPriority: 10,
      syncInterval: 360,
      rateLimit: 60,
      rateLimitWindow: 3600,
      isActive: true,
      isVerified: true,
      totalUsers: 1250,
      successRate: 94.5,
      avgSyncDuration: 2500,
    },
    {
      slug: 'github',
      name: 'GitHub',
      displayName: 'GitHub',
      description: 'Where the world builds software',
      category: PlatformCategory.GIT,
      authType: AuthType.OAUTH,
      icon: '🐙',
      logo: '/logos/github.png',
      color: '#181717',
      backgroundColor: '#F6F8FA',
      website: 'https://github.com',
      apiEndpoint: 'https://api.github.com',
      profileUrlPattern: 'https://github.com/{username}',
      supportsAutoSync: true,
      supportsWebhook: true,
      supportsOAuth: true,
      supportsApiKey: true,
      requiresCredentials: false,
      syncPriority: 10,
      syncInterval: 720,
      rateLimit: 5000,
      rateLimitWindow: 3600,
      isActive: true,
      isVerified: true,
      totalUsers: 2100,
      successRate: 98.2,
      avgSyncDuration: 1800,
    },
    {
      slug: 'codeforces',
      name: 'Codeforces',
      displayName: 'Codeforces',
      description: 'Competitive programming platform',
      category: PlatformCategory.DSA,
      authType: AuthType.API_KEY,
      icon: '🏆',
      logo: '/logos/codeforces.png',
      color: '#1F8ACB',
      backgroundColor: '#E8F4F8',
      website: 'https://codeforces.com',
      apiEndpoint: 'https://codeforces.com/api',
      profileUrlPattern: 'https://codeforces.com/profile/{username}',
      supportsAutoSync: true,
      supportsWebhook: false,
      supportsOAuth: false,
      supportsApiKey: true,
      requiresCredentials: false,
      syncPriority: 8,
      syncInterval: 1440,
      rateLimit: 100,
      rateLimitWindow: 300,
      isActive: true,
      isVerified: true,
      totalUsers: 850,
      successRate: 96.8,
      avgSyncDuration: 1200,
    },
    {
      slug: 'hackerrank',
      name: 'HackerRank',
      displayName: 'HackerRank',
      description: 'Practice coding, prepare for interviews',
      category: PlatformCategory.DSA,
      authType: AuthType.SCRAPING,
      icon: '💚',
      logo: '/logos/hackerrank.png',
      color: '#00EA64',
      backgroundColor: '#E6FFF4',
      website: 'https://www.hackerrank.com',
      profileUrlPattern: 'https://www.hackerrank.com/{username}',
      supportsAutoSync: true,
      supportsWebhook: false,
      supportsOAuth: false,
      supportsApiKey: false,
      requiresCredentials: true,
      syncPriority: 7,
      syncInterval: 720,
      isActive: true,
      isVerified: true,
      totalUsers: 920,
      successRate: 91.3,
      avgSyncDuration: 3200,
    },
    {
      slug: 'linkedin',
      name: 'LinkedIn',
      displayName: 'LinkedIn',
      description: 'Professional networking platform',
      category: PlatformCategory.JOB,
      authType: AuthType.OAUTH,
      icon: '💼',
      logo: '/logos/linkedin.png',
      color: '#0A66C2',
      backgroundColor: '#E7F3FF',
      website: 'https://www.linkedin.com',
      apiEndpoint: 'https://api.linkedin.com/v2',
      profileUrlPattern: 'https://www.linkedin.com/in/{username}',
      supportsAutoSync: true,
      supportsWebhook: false,
      supportsOAuth: true,
      supportsApiKey: false,
      requiresCredentials: false,
      syncPriority: 6,
      syncInterval: 1440,
      rateLimit: 100,
      rateLimitWindow: 86400,
      isActive: true,
      isVerified: true,
      totalUsers: 1500,
      successRate: 95.7,
      avgSyncDuration: 2100,
    },
    // Add remaining platforms with same pattern...
  ];

  for (const platform of platforms) {
    await prisma.platform.create({ data: platform });
  }

  console.log(`✅ Created ${platforms.length} platforms`);
}

async function seedUsers() {
  console.log('👥 Seeding users...');

  const hashedPassword = await bcrypt.hash('Password123!', 10);
  
  const users = [
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      username: 'johndoe',
      password: hashedPassword,
      emailVerified: new Date(),
      bio: 'Full-stack developer passionate about algorithms and competitive programming',
      location: 'San Francisco, CA',
      website: 'https://johndoe.dev',
      company: 'Tech Corp',
      jobTitle: 'Senior Software Engineer',
      githubUsername: 'johndoe',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      twitterHandle: '@johndoe',
      isPublic: true,
      isActive: true,
      isVerified: true,
      isAdmin: true,
      role: 'admin',
      currentStreak: 45,
      longestStreak: 89,
      lastActivityDate: new Date(),
      streakStartDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      totalProblems: 450,
      totalCommits: 1250,
      totalProjects: 23,
      totalCertifications: 5,
      totalAchievements: 12,
      totalPoints: 8900,
      rank: 1,
      preferredLanguage: 'en',
      timezone: 'America/Los_Angeles',
    },
    // Add remaining users...
  ];

  for (const user of users) {
    await prisma.user.create({ data: user });
  }

  console.log(`✅ Created ${users.length} users`);
}

async function seedUserPlatforms() {
  console.log('🔗 Seeding user platforms...');

  const users = await prisma.user.findMany({ take: 10 });
  const platforms = await prisma.platform.findMany({ take: 10 });

  const userPlatforms = [];

  // Connect first user to all platforms
  for (const platform of platforms) {
    userPlatforms.push({
      userId: users[0].id,
      platformId: platform.id,
      username: `${users[0].username}_${platform.slug}`,
      profileUrl: platform.profileUrlPattern?.replace('{username}', users[0].username || ''),
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      connectionStatus: 'connected',
      syncStatus: SyncStatus.SUCCESS, // ✅ Fixed: Using enum
      lastSyncedAt: new Date(),
      autoSync: true,
      notifyOnSync: false,
      notifyOnError: true,
    });
  }

  // Connect other users to random platforms
  for (let i = 1; i < users.length; i++) {
    const numPlatforms = Math.floor(Math.random() * 5) + 3;
    const selectedPlatforms = platforms
      .sort(() => 0.5 - Math.random())
      .slice(0, numPlatforms);

    for (const platform of selectedPlatforms) {
      userPlatforms.push({
        userId: users[i].id,
        platformId: platform.id,
        username: `${users[i].username}_${platform.slug}`,
        profileUrl: platform.profileUrlPattern?.replace('{username}', users[i].username || ''),
        isActive: true,
        isVerified: Math.random() > 0.2,
        verifiedAt: Math.random() > 0.2 ? new Date() : null,
        connectionStatus: Math.random() > 0.1 ? 'connected' : 'pending',
        syncStatus: Math.random() > 0.2 ? SyncStatus.SUCCESS : SyncStatus.IDLE, // ✅ Fixed: Using enum
        lastSyncedAt: Math.random() > 0.3 ? new Date() : null,
        autoSync: Math.random() > 0.3,
      });
    }
  }

  for (const up of userPlatforms) {
    await prisma.userPlatform.create({ data: up });
  }

  console.log(`✅ Created ${userPlatforms.length} user platform connections`);
}

async function seedTrackerEntries() {
  console.log('📊 Seeding tracker entries...');

  const users = await prisma.user.findMany({ take: 5 });
  const platforms = await prisma.platform.findMany({ take: 10 });

  const entries = [];
  const today = new Date();

  for (const user of users) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];

      entries.push({
        userId: user.id,
        platformId: randomPlatform.id,
        date: date,
        category: randomPlatform.category,
        problemsSolved: Math.floor(Math.random() * 10),
        problemsAttempted: Math.floor(Math.random() * 15),
        easyProblems: Math.floor(Math.random() * 5),
        mediumProblems: Math.floor(Math.random() * 4),
        hardProblems: Math.floor(Math.random() * 2),
        commits: Math.floor(Math.random() * 20),
        pullRequests: Math.floor(Math.random() * 3),
        issuesOpened: Math.floor(Math.random() * 2),
        timeSpent: Math.floor(Math.random() * 240) + 30,
        source: Math.random() > 0.3 ? 'sync' : 'manual',
        isVerified: Math.random() > 0.2,
        tags: ['daily', 'progress'],
        languages: ['JavaScript', 'Python', 'TypeScript'].slice(0, Math.floor(Math.random() * 3) + 1),
      });
    }
  }

  for (const entry of entries) {
    await prisma.trackerEntry.create({ data: entry });
  }

  console.log(`✅ Created ${entries.length} tracker entries`);
}

async function seedGoals() {
  console.log('🎯 Seeding goals...');

  const users = await prisma.user.findMany({ take: 5 });
  const platforms = await prisma.platform.findMany({ take: 3 });

  const goals = [
    {
      userId: users[0].id,
      platformId: platforms[0].id,
      title: 'Solve 100 LeetCode Problems',
      description: 'Complete 100 algorithmic problems on LeetCode',
      category: PlatformCategory.DSA,
      goalType: GoalType.MONTHLY, // ✅ Fixed: Using enum
      metric: GoalMetric.PROBLEMS_SOLVED, // ✅ Fixed: Using enum
      target: 100,
      progress: 45,
      progressPercentage: 45,
      status: GoalStatus.ACTIVE, // ✅ Fixed: Using enum
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isPublic: true,
      reminderEnabled: true,
      color: '#FFA116',
    },
    {
      userId: users[0].id,
      title: 'Maintain 60-Day Streak',
      description: 'Code every day for 60 consecutive days',
      category: PlatformCategory.DSA,
      goalType: GoalType.STREAK, // ✅ Fixed
      metric: GoalMetric.STREAK_DAYS, // ✅ Fixed
      target: 60,
      progress: 45,
      progressPercentage: 75,
      status: GoalStatus.ACTIVE, // ✅ Fixed
      currentStreakDays: 45,
      requiredStreakDays: 60,
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      isPublic: true,
    },
    {
      userId: users[1].id,
      platformId: platforms[1].id,
      title: '50 GitHub Commits',
      description: 'Make 50 meaningful commits this month',
      category: PlatformCategory.GIT,
      goalType: GoalType.MONTHLY,
      metric: GoalMetric.COMMITS,
      target: 50,
      progress: 32,
      progressPercentage: 64,
      status: GoalStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isPublic: true,
    },
    // Add remaining goals with same pattern...
  ];

  for (const goal of goals) {
    await prisma.goal.create({ data: goal });
  }

  console.log(`✅ Created ${goals.length} goals`);
}

async function seedAchievements() {
  console.log('🏆 Seeding achievements...');

  const achievements = [
    {
      slug: 'first-problem',
      title: 'First Steps',
      description: 'Solve your first coding problem',
      category: PlatformCategory.DSA,
      tier: 'bronze',
      icon: '🎯',
      color: '#CD7F32',
      points: 10,
      xpReward: 50,
      rarity: 'common',
      requirement: { type: 'problems_solved', value: 1 },
      requirementText: 'Solve 1 problem',
      isActive: true,
      totalUnlocked: 8,
      unlockPercentage: 80,
    },
    // Add remaining achievements...
  ];

  const createdAchievements = [];
  for (const achievement of achievements) {
    const created = await prisma.achievement.create({ data: achievement });
    createdAchievements.push(created);
  }

  console.log(`✅ Created ${achievements.length} achievements`);
}

async function seedNotifications() {
  console.log('🔔 Seeding notifications...');

  const users = await prisma.user.findMany({ take: 3 });

  const notifications = [
    {
      userId: users[0].id,
      type: NotificationType.ACHIEVEMENT_UNLOCKED, // ✅ Fixed: Using enum
      channel: NotificationChannel.IN_APP, // ✅ Fixed: Using enum
      priority: NotificationPriority.HIGH, // ✅ Fixed: Using enum
      title: 'Achievement Unlocked!',
      message: 'Congratulations! You\'ve unlocked "Problem Solver" achievement',
      shortMessage: 'New achievement unlocked',
      actionUrl: '/dashboard/achievements',
      actionLabel: 'View Achievement',
      isRead: false,
      isDelivered: true,
      deliveredAt: new Date(),
    },
    {
      userId: users[0].id,
      type: NotificationType.GOAL_REMINDER, // ✅ Fixed
      channel: NotificationChannel.IN_APP, // ✅ Fixed
      priority: NotificationPriority.NORMAL, // ✅ Fixed
      title: 'Goal Reminder',
      message: 'Don\'t forget about your goal: Solve 100 LeetCode Problems. You\'re 45% there!',
      shortMessage: 'Goal progress reminder',
      actionUrl: '/dashboard/goals',
      actionLabel: 'View Goal',
      isRead: true,
      readAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isDelivered: true,
      deliveredAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    // Add remaining notifications with same pattern...
  ];

  for (const notification of notifications) {
    await prisma.notification.create({ data: notification });
  }

  console.log(`✅ Created ${notifications.length} notifications`);
}

async function seedGoalTemplates() {
  console.log('📋 Seeding goal templates...');

  const templates = [
    {
      title: 'Daily Problem Solver',
      description: 'Solve at least one coding problem every day',
      category: PlatformCategory.DSA,
      goalType: GoalType.DAILY, // ✅ Fixed: Using enum
      metric: GoalMetric.PROBLEMS_SOLVED, // ✅ Fixed: Using enum
      target: 1,
      duration: 1,
      icon: '🎯',
      color: '#4CAF50',
      difficulty: 'easy',
      estimatedTime: '30-60 minutes',
      tips: ['Start with easy problems', 'Focus on understanding concepts', 'Review solutions'],
      isActive: true,
      isFeatured: true,
      timesUsed: 450,
      successRate: 78.5,
      avgCompletionTime: 45,
    },
    // Add remaining templates with same pattern...
  ];

  for (const template of templates) {
    await prisma.goalTemplate.create({ data: template });
  }

  console.log(`✅ Created ${templates.length} goal templates`);
}

async function seedFeatureFlags() {
  console.log('🚩 Seeding feature flags...');

  const flags = [
    {
      key: 'enable_ai_insights',
      name: 'AI-Powered Insights',
      description: 'Enable AI-generated insights and recommendations',
      isEnabled: false,
      enabledForAll: false,
      enabledTiers: [SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE], // ✅ Fixed: Using enum array
      enabledPercentage: 25,
    },
    {
      key: 'enable_team_features',
      name: 'Team Features',
      description: 'Enable team collaboration and management features',
      isEnabled: true,
      enabledForAll: false,
      enabledTiers: [SubscriptionTier.TEAM, SubscriptionTier.ENTERPRISE], // ✅ Fixed
      enabledPercentage: 100,
    },
    {
      key: 'enable_dark_mode',
      name: 'Dark Mode',
      description: 'Enable dark mode theme',
      isEnabled: true,
      enabledForAll: true,
      enabledPercentage: 100,
    },
    // Add remaining flags...
  ];

  for (const flag of flags) {
    await prisma.featureFlag.create({ data: flag });
  }

  console.log(`✅ Created ${flags.length} feature flags`);
}

async function seedSystemSettings() {
  console.log('⚙️ Seeding system settings...');

  const settings = [
    {
      key: 'maintenance_mode',
      value: { enabled: false },
      description: 'Enable/disable maintenance mode',
      category: 'system',
      isPublic: true,
    },
    {
      key: 'registration_enabled',
      value: { enabled: true },
      description: 'Enable/disable new user registration',
      category: 'auth',
      isPublic: true,
    },
    // Add remaining settings...
  ];

  for (const setting of settings) {
    await prisma.systemSettings.create({ data: setting });
  }

  console.log(`✅ Created ${settings.length} system settings`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });