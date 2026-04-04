const fs = require('fs');
const path = require('path');

const cronDir = path.join('src', 'app', 'api', 'cron');

const dirs = fs.readdirSync(cronDir).filter(d => {
  return fs.existsSync(path.join(cronDir, d, 'route.ts'));
});

let fixed = 0, skipped = 0;

for (const dir of dirs) {
  const filePath = path.join(cronDir, dir, 'route.ts');
  let c = fs.readFileSync(filePath, 'utf8');
  const original = c;

  // Fix duplicate export const GET/POST — remove old alias exports before the withCronAuth block
  // Pattern: "export const GET = POST;" or "export const GET = handler;" before the secured exports
  c = c.replace(/^export const (GET|POST) = (POST|GET|handleCleanup|handler);\s*\/\/ .*\n/gm, '');
  c = c.replace(/^export const (GET|POST) = (POST|GET|handleCleanup|handler);\s*\n/gm, '');
  
  // Also remove: export const GET = POST; // Allow GET for easier testing/Vercel cron
  c = c.replace(/^export const (GET|POST) = (POST|GET|handleCleanup|handler);\s*\/\/.*\n/gm, '');

  // Remove redundant inline auth checks that are now handled by withCronAuth
  // These are safe to remove since withCronAuth runs first and returns 401/403 before handler runs
  c = c.replace(/\s+const authHeader = req\.headers\.get\(['"]Authorization['"]\);\n\s+if \(authHeader !== `Bearer \$\{process\.env\.CRON_SECRET\}`\) \{\n\s+return NextResponse\.json\(\{ error: ["']Unauthorized["'] \}, \{ status: 401 \}\);\n\s+\}\n/g, '\n');
  c = c.replace(/\s+const authHeader = req\.headers\.get\(['"]authorization['"]\);\n\s+if \(authHeader !== `Bearer \$\{process\.env\.CRON_SECRET\}`\) \{\n\s+return NextResponse\.json\(\{ error: ["']Unauthorized["'] \}, \{ status: 401 \}\);\n\s+\}\n/g, '\n');

  if (c !== original) {
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('FIXED:', dir);
    fixed++;
  } else {
    console.log('OK:', dir);
    skipped++;
  }
}

console.log('\n=== DONE ===');
console.log('Fixed:', fixed, '| Already OK:', skipped);
