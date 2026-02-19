
import { platforms } from '../config/platforms';

try {
    console.log('Successfully imported platforms config.');
    console.log(`Total platforms: ${platforms.length}`);
    console.log(`First platform: ${platforms[0].id}`);
    console.log(`Last platform: ${platforms[platforms.length - 1].id}`);

    // Check for duplicates
    const ids = platforms.map(p => p.id);
    const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);

    if (duplicates.length > 0) {
        console.error('Found duplicate IDs:', duplicates);
        process.exit(1);
    } else {
        console.log('No duplicate IDs found.');
    }

} catch (error) {
    console.error('Error reading platforms config:', error);
    process.exit(1);
}
