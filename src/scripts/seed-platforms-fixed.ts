import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import {
    platforms,
    CATEGORY_TO_PRISMA,
    AUTH_TYPE_TO_PRISMA
} from '../config/platforms';

const prisma = new PrismaClient();

async function seedPlatforms() {
    console.log(`📦 Seeding ${platforms.length} platforms...`);

    let successful = 0;
    let failed = 0;

    for (const platformConfig of platforms) {
        try {
            // Map category and authType using the config maps
            const category = CATEGORY_TO_PRISMA[platformConfig.category];
            const authType = AUTH_TYPE_TO_PRISMA[platformConfig.authType];

            if (!category) {
                console.warn(`⚠️ Warning: Unknown category '${platformConfig.category}' for ${platformConfig.name}. Defaulting to OTHER.`);
            }
            if (!authType) {
                console.warn(`⚠️ Warning: Unknown authType '${platformConfig.authType}' for ${platformConfig.name}. Defaulting to NONE.`);
            }

            const platformData: Prisma.PlatformCreateInput = {
                slug: platformConfig.slug,
                name: platformConfig.name,
                displayName: platformConfig.displayName || platformConfig.name,
                description: platformConfig.description || null,
                category: category || 'OTHER',
                tags: platformConfig.tags || [],
                authType: authType || 'NONE',
                icon: platformConfig.icon || null,
                logo: platformConfig.logo || null,
                color: platformConfig.color || null,
                backgroundColor: platformConfig.backgroundColor || null,
                website: platformConfig.website || null,
                apiEndpoint: platformConfig.apiEndpoint || null,
                profileUrlPattern: platformConfig.profileUrlPattern || null,
                supportsAutoSync: platformConfig.supportsAutoSync || false,
                supportsWebhook: platformConfig.supportsWebhook || false,
                supportsOAuth: platformConfig.supportsOAuth || false,
                supportsApiKey: platformConfig.supportsApiKey || false,
                requiresCredentials: platformConfig.requiresCredentials || false,
                syncPriority: platformConfig.syncPriority || 0,
                syncInterval: platformConfig.syncInterval || 1440,
                rateLimit: platformConfig.rateLimit || null,
                rateLimitWindow: platformConfig.rateLimitWindow || null,
                dataPoints: platformConfig.dataPoints || [],
                isActive: true, // Force active for connected platforms
                isVerified: true
            };

            await prisma.platform.upsert({
                where: { slug: platformData.slug },
                update: platformData,
                create: platformData,
            });

            successful++;
        } catch (err: any) {
            console.error(`❌ Failed to seed ${platformConfig.name}:`, err.message);
            failed++;
        }
    }

    console.log(`\n✅ Seeding completed.`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed:     ${failed}`);
}

seedPlatforms()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
