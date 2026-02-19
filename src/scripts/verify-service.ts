
import PlatformService from '../services/platformService';

async function main() {
    console.log('Checking PlatformService...');
    try {
        const id = await PlatformService.resolveDbId('leetcode');
        console.log('resolveDbId("leetcode") result:', id);
        if (!PlatformService.resolveDbId) {
            console.error('ERROR: resolveDbId is undefined!');
        } else {
            console.log('SUCCESS: resolveDbId exists.');
        }
    } catch (error) {
        console.error('Error calling resolveDbId:', error);
    }
}

main();
