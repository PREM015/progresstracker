import { prisma } from './src/lib/prisma';
import { GitHubScraper } from './src/services/scrapers/githubScraper';
import { SyncService } from './src/services/syncService';

async function testDeepSync() {
    const userId = 'user_id_here'; // Replace with a test user ID if possible
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No user found');
        return;
    }

    const githubPlatform = await prisma.platform.findUnique({ where: { slug: 'github' } });
    if (!githubPlatform) {
        console.log('GitHub platform not found');
        return;
    }

    const userPlatform = await prisma.userPlatform.findUnique({
        where: { userId_platformId: { userId: user.id, platformId: githubPlatform.id } }
    });

    if (!userPlatform || (!userPlatform.username && !userPlatform.accessToken)) {
        console.log('No GitHub connection for first user found');
        return;
    }

    console.log(`Starting deep sync for user ${user.id} (${userPlatform.username})`);
    const result = await SyncService.syncPlatform(user.id, githubPlatform.id, { triggeredBy: 'test-script' });
    console.log('Sync Result:', JSON.stringify(result, null, 2));

    const entryCount = await prisma.trackerEntry.count({
        where: { userId: user.id, platformId: githubPlatform.id }
    });
    console.log(`Total entries for GitHub: ${entryCount}`);
}

testDeepSync().catch(console.error);
