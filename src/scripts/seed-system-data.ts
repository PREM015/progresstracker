
import { PrismaClient, PlatformCategory, SubscriptionTier, GoalType, GoalMetric } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting system data seeding (Metadata Only)...');

    // We DO NOT clear the database to preserve existing user data.
    // We use upsert/check-exists to avoid duplicates.

    await seedPlatforms();
    await seedAchievements();
    await seedGoalTemplates();
    await seedFeatureFlags();
    await seedSystemSettings();

    console.log('✅ System data seeding completed successfully!');
}

async function seedPlatforms() {
    console.log('📦 Seeding platforms...');

    // We'll import the config dynamically or define a subset here for safety/simplicity in this script
    // replicating the logic from the original seed but ensuring it runs standalone.
    try {
        // Try to rely on the existing codebase config if possible, 
        // but to ensure this script runs without complex path aliases setup for tsx/ts-node,
        // I will rely on the fact that we are running this in the project context.
        // However, to be absolutely safe and "fix" the missing data immediately, 
        // I will define the critical Achievement/Platform data directly here 
        // or duplicate the safe parts of the logic.

        // Actually, for Platforms, let's try to verify if they exist first.
        const count = await prisma.platform.count();
        if (count > 0) {
            console.log(`ℹ️ Platforms already exist (${count}). Skipping to preserve custom config.`);
            // If we want to force update, we would need to define the data. 
            // Assuming platforms might be fine or we want to seek the "real" lists.
            // Let's rely on the original seed's logic for platforms if we can, 
            // but since I can't easily import 'src/config/platforms' without alias issues in some envs:
            // I will proceed to seed Achievements which is the critical missing piece for the user.
        } else {
            console.log('⚠️ No platforms found. You may need to run the full seed or check configuration.');
            // For now, let's focus on Achievements as that's the current error.
        }
    } catch (e) {
        console.error('Error checking platforms:', e);
    }
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
            totalUnlocked: 0,
            unlockPercentage: 0,
            sortOrder: 1
        },
        {
            slug: 'problem-solver-novice',
            title: 'Novice Solver',
            description: 'Solve 10 coding problems',
            category: PlatformCategory.DSA,
            tier: 'bronze',
            icon: '🧩',
            color: '#CD7F32',
            points: 50,
            xpReward: 200,
            rarity: 'common',
            requirement: { type: 'problems_solved', value: 10 },
            requirementText: 'Solve 10 problems',
            isActive: true,
            sortOrder: 2
        },
        {
            slug: 'problem-solver-intermediate',
            title: 'Intermediate Solver',
            description: 'Solve 50 coding problems',
            category: PlatformCategory.DSA,
            tier: 'silver',
            icon: '⚡',
            color: '#C0C0C0',
            points: 100,
            xpReward: 500,
            rarity: 'uncommon',
            requirement: { type: 'problems_solved', value: 50 },
            requirementText: 'Solve 50 problems',
            isActive: true,
            sortOrder: 3
        },
        {
            slug: 'problem-solver-expert',
            title: 'Expert Solver',
            description: 'Solve 100 coding problems',
            category: PlatformCategory.DSA,
            tier: 'gold',
            icon: '🔥',
            color: '#FFD700',
            points: 500,
            xpReward: 1000,
            rarity: 'rare',
            requirement: { type: 'problems_solved', value: 100 },
            requirementText: 'Solve 100 problems',
            isActive: true,
            sortOrder: 4
        },
        {
            slug: 'streak-week',
            title: 'Consistency is Key',
            description: 'Maintain a 7-day streak',
            category: PlatformCategory.DSA,
            tier: 'silver',
            icon: '📅',
            color: '#C0C0C0',
            points: 100,
            xpReward: 300,
            rarity: 'uncommon',
            requirement: { type: 'streak_days', value: 7 },
            requirementText: '7-day streak',
            isActive: true,
            sortOrder: 5
        },
        {
            slug: 'streak-month',
            title: 'Dedicated Developer',
            description: 'Maintain a 30-day streak',
            category: PlatformCategory.DSA,
            tier: 'gold',
            icon: '🏆',
            color: '#FFD700',
            points: 500,
            xpReward: 1500,
            rarity: 'rare',
            requirement: { type: 'streak_days', value: 30 },
            requirementText: '30-day streak',
            isActive: true,
            sortOrder: 6
        },
        {
            slug: 'git-contributor',
            title: 'Open Source Contributor',
            description: 'Make your first contribution',
            category: PlatformCategory.GIT,
            tier: 'bronze',
            icon: '🌱',
            color: '#CD7F32',
            points: 20,
            xpReward: 100,
            rarity: 'common',
            requirement: { type: 'commits', value: 1 },
            requirementText: '1 commit',
            isActive: true,
            sortOrder: 7
        },
        {
            slug: 'git-active',
            title: 'Active Contributor',
            description: 'Make 50 commits',
            category: PlatformCategory.GIT,
            tier: 'silver',
            icon: '🌿',
            color: '#C0C0C0',
            points: 100,
            xpReward: 400,
            rarity: 'uncommon',
            requirement: { type: 'commits', value: 50 },
            requirementText: '50 commits',
            isActive: true,
            sortOrder: 8
        }
    ];

    for (const achievement of achievements) {
        // Upsert to create or update if exists, avoiding duplicates
        await prisma.achievement.upsert({
            where: { slug: achievement.slug },
            update: achievement,
            create: achievement,
        });
    }

    console.log(`✅ Seeded/Updated ${achievements.length} achievements`);
}

async function seedGoalTemplates() {
    console.log('📋 Seeding goal templates...');

    const templates = [
        {
            title: 'Daily Problem Solver',
            description: 'Solve at least one coding problem every day',
            category: PlatformCategory.DSA,
            goalType: GoalType.DAILY,
            metric: GoalMetric.PROBLEMS_SOLVED,
            target: 1,
            duration: 1,
            icon: '🎯',
            color: '#4CAF50',
            difficulty: 'easy',
            estimatedTime: '30-60 minutes',
            tips: ['Start with easy problems', 'Focus on understanding concepts', 'Review solutions'],
            isActive: true,
            isFeatured: true,
            sortOrder: 1
        },
        {
            title: 'Weekly Commit Challenge',
            description: 'Make 5 commits this week',
            category: PlatformCategory.GIT,
            goalType: GoalType.WEEKLY,
            metric: GoalMetric.COMMITS,
            target: 5,
            duration: 7,
            icon: '💻',
            color: '#2196F3',
            difficulty: 'easy',
            estimatedTime: '2-3 hours',
            tips: ['Commit early and often', 'Write meaningful commit messages'],
            isActive: true,
            isFeatured: true,
            sortOrder: 2
        }
    ];

    for (const template of templates) {
        // Check existence by title since there's no unique slug for templates
        const existing = await prisma.goalTemplate.findFirst({
            where: { title: template.title }
        });

        if (existing) {
            await prisma.goalTemplate.update({
                where: { id: existing.id },
                data: template
            });
        } else {
            await prisma.goalTemplate.create({
                data: template
            });
        }
    }

    console.log(`✅ Seeded/Updated ${templates.length} goal templates`);
}

async function seedFeatureFlags() {
    console.log('🚩 Seeding feature flags...');

    const flags = [
        {
            key: 'enable_dark_mode',
            name: 'Dark Mode',
            description: 'Enable dark mode theme',
            isEnabled: true,
            enabledForAll: true,
            enabledPercentage: 100,
        },
        {
            key: 'enable_ai_insights',
            name: 'AI-Powered Insights',
            description: 'Enable AI-generated insights and recommendations',
            isEnabled: false,
            enabledForAll: false,
            enabledTiers: [SubscriptionTier.PRO, SubscriptionTier.ENTERPRISE],
            enabledPercentage: 25,
        }
    ];

    for (const flag of flags) {
        await prisma.featureFlag.upsert({
            where: { key: flag.key },
            update: flag,
            create: flag,
        });
    }

    console.log(`✅ Seeded/Updated ${flags.length} feature flags`);
}

async function seedSystemSettings() {
    console.log('⚙️ Seeding system settings...');

    const settings = [
        {
            key: 'registration_enabled',
            value: { enabled: true },
            description: 'Enable/disable new user registration',
            category: 'auth',
            isPublic: true,
        }
    ];

    for (const setting of settings) {
        await prisma.systemSettings.upsert({
            where: { key: setting.key },
            update: setting,
            create: setting,
        });
    }

    console.log(`✅ Seeded/Updated ${settings.length} system settings`);
}

main()
    .catch((e) => {
        console.error('❌ Error seeding system data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
