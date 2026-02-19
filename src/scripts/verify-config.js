
const fs = require('fs');
const path = require('path');

try {
    const configPath = path.join(process.cwd(), 'src/config/platforms.ts');
    console.log('Reading file:', configPath);
    if (!fs.existsSync(configPath)) {
        console.error('File not found:', configPath);
        process.exit(1);
    }
    const content = fs.readFileSync(configPath, 'utf8');

    // Basic syntax check using regex for matching braces/brackets
    // This isn't a full parser but catches gross errors
    let openBraces = 0;
    let openBrackets = 0;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
    }

    console.log(`Brace balance: ${openBraces} (Should be 0)`);
    console.log(`Bracket balance: ${openBrackets} (Should be 0)`);

    if (openBraces !== 0 || openBrackets !== 0) {
        console.error('CRITICAL: Syntax error in platforms.ts - unmatched braces or brackets!');
        process.exit(1);
    }

    console.log('Basic syntax check passed.');

} catch (error) {
    console.error('Error verifying platforms.ts:', error);
    process.exit(1);
}
