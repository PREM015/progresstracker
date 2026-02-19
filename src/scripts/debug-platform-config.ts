
import PlatformService from '../services/platformService';
import { platforms } from '../config/platforms';

async function main() {
    console.log('--- DEBUGGING PLATFORM SERVICE ---');
    console.log(`Raw config platforms count: ${platforms.length}`);

    const leetcode = platforms.find(p => p.id === 'leetcode');
    console.log('Ref check - LeetCode in config:', !!leetcode);

    console.log('Calling PlatformService.getAllPlatforms()...');
    try {
        const result = await PlatformService.getAllPlatforms({ isActive: true });
        console.log(`Service returned ${result.data.length} platforms.`);

        // Check Codeforces
        const cf = await PlatformService.getPlatformById('codeforces');
        console.log('Service getPlatformById("codeforces"):', cf ? 'FOUND' : 'NULL');
        if (cf) {
            console.log('CF details:', JSON.stringify(cf, null, 2));
        }

    } catch (err) {
        console.error('Error calling service:', err);
    }
}

main();
