#!/usr/bin/env node
// scripts/patch-cron-auth.mjs
// Patches all cron route.ts files to use withCronAuth HOF
// Run: node scripts/patch-cron-auth.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const CRON_DIR = join(process.cwd(), 'src', 'app', 'api', 'cron');
const IMPORT_LINE = `import { withCronAuth } from '@/lib/server/cron-auth';`;

// Patterns to detect existing inline auth checks (to remove them)
const INLINE_AUTH_PATTERNS = [
  // Pattern 1: cleanup style — if (!cronSecret) ... if (authHeader !== `Bearer ${cronSecret}`)
  /\/\/ ── Authorization.*?─+\n.*?const cronSecret.*?;\n.*?if \(!cronSecret\).*?\}\n\n.*?const authHeader.*?;\n.*?if \(authHeader !== .*?CRON_SECRET.*?\).*?\}\n/gs,
  // Pattern 2: streak-check / daily-sync style — const CRON_SECRET = ... + if (CRON_SECRET && ...)
  /\/\/ Verify cron secret.*?\n.*?const CRON_SECRET = process\.env\.CRON_SECRET;\n/g,
  /\/\/ Verify (cron secret|authorization).*?\n.*?const authHeader = req\.headers\.get\('authorization'\);\n.*?if \(CRON_SECRET.*?authHeader.*?\).*?\}\n/gs,
  // Pattern 3: leaderboard / token-cleanup style — inline Bearer check  
  /\s*const authHeader = req\.(headers|headers)\.get\(['"]Authorization['"]\);\s*\n\s*if \(authHeader !== `Bearer \$\{process\.env\.CRON_SECRET\}`\) \{\s*\n\s*return NextResponse\.json\(\{ error: ["']Unauthorized["'] \}, \{ status: 401 \}\);\s*\n\s*\}\n/g,
  /\s*const authHeader = request\.headers\.get\(['"]authorization['"]\);\s*\n\s*if \(authHeader !== `Bearer \$\{CRON_SECRET\}`\) \{\s*\n.*?Unauthorized.*?\n\s*\}\n/gs,
];

function getAllCronRoutes(dir) {
  const results = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      const routePath = join(fullPath, 'route.ts');
      try {
        statSync(routePath);
        results.push(routePath);
      } catch {
        // No route.ts in this cron subdir
      }
    }
  }
  return results;
}

function wrapExports(content, routePath) {
  // Wrap GET and POST handlers with withCronAuth
  // The handlers may be:
  //   export async function GET(req) { ... }  → export const GET = withCronAuth(async (req) => { ... });
  //   export const GET = POST;                → export const GET = withCronAuth(POST_handler);
  //   export const POST = async (req) => {   → export const POST = withCronAuth(async (req) => {

  let result = content;
  let modified = false;

  // Already patched?
  if (content.includes('withCronAuth')) {
    console.log(`  ⏭  Already patched: ${routePath}`);
    return null;
  }

  // 1. Add import at the top (after last import line)
  const lastImportIdx = result.lastIndexOf('import ');
  const lastImportEnd = result.indexOf('\n', lastImportIdx) + 1;
  if (!result.includes(IMPORT_LINE)) {
    result = result.slice(0, lastImportEnd) + IMPORT_LINE + '\n' + result.slice(lastImportEnd);
    modified = true;
  }

  // 2. Remove inline auth patterns (simple approach: remove the const CRON_SECRET line + auth block)
  // Remove: const CRON_SECRET = process.env.CRON_SECRET;
  result = result.replace(/^const CRON_SECRET = process\.env\.CRON_SECRET;\s*\n/m, '');
  
  // Remove inline auth check blocks (various patterns)
  // Pattern A: if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) { ... }
  result = result.replace(
    /\s*\/\/ Verify (authorization|cron secret).*?\n(\s*const authHeader[^\n]+\n)?\s*if \(CRON_SECRET.*?return NextResponse\.json\(\{[^}]+\},\s*\{[^}]+\}\);\s*\n\s*\}/gs,
    ''
  );
  
  // Pattern B: if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }
  result = result.replace(
    /\s*(const authHeader[^\n]+\n)?\s*if \(authHeader !== `Bearer \$\{process\.env\.CRON_SECRET\}`\) \{\s*\n\s*return NextResponse\.json\([^)]+\),\s*\{[^}]+\}\);\s*\n\s*\}/g,
    ''
  );

  // Pattern C: cleanup-style block (multi-line)
  result = result.replace(
    /\s*\/\/ ─+ Authorization ─+\s*\n\s*const cronSecret = process\.env\.CRON_SECRET;[\s\S]*?return NextResponse\.json\(\{ error: 'Unauthorized'[^}]+\}, \{ status: 401 \}\);\n\s*\}/,
    ''
  );

  // 3. Wrap exported handlers
  // Pattern: export async function GET(request: NextRequest) {
  result = result.replace(
    /^(export async function (GET|POST|handler)\(([^)]+)\))\s*\{/gm,
    (match, _full, name, params) => {
      modified = true;
      return `async function _${name}(${params}) {`;
    }
  );

  // Pattern: export const GET = POST;  or  export const GET = handler;
  // These alias patterns — keep as-is after renaming above

  // Pattern: export const POST = async (req ...) => {
  result = result.replace(
    /^export const (GET|POST) = async \(([^)]+)\) =>/gm,
    (_match, name, params) => {
      modified = true;
      return `const _${name} = async (${params}) =>`;
    }
  );

  // Add exports at the end
  const handlerNames = [];
  for (const name of ['GET', 'POST', 'handler']) {
    if (result.includes(`async function _${name}`) || result.includes(`const _${name}`)) {
      handlerNames.push(name);
    }
  }

  if (handlerNames.length > 0) {
    // Remove old export const GET = POST; style re-exports
    result = result.replace(/^export const (GET|POST) = (GET|POST|handleCleanup|handler);\s*$/gm, '');

    // Add wrapped exports
    const exportBlock = '\n// ── Cron auth wrappers (added by patch-cron-auth.mjs) ──────────────────────\n' +
      handlerNames.map(n => `export const ${n} = withCronAuth(_${n});`).join('\n') +
      '\n';
    result += exportBlock;
    modified = true;
  }

  return modified ? result : null;
}

const routes = getAllCronRoutes(CRON_DIR);
console.log(`\nFound ${routes.length} cron routes to patch:\n`);

let patched = 0;
let skipped = 0;
let errors = 0;

for (const routePath of routes) {
  const dirName = routePath.split('cron')[1].replace(/\\/g, '/').replace('/route.ts', '');
  try {
    const original = readFileSync(routePath, 'utf-8');
    const patched_content = wrapExports(original, dirName);
    
    if (patched_content === null) {
      skipped++;
    } else {
      writeFileSync(routePath, patched_content, 'utf-8');
      console.log(`  ✅ Patched: ${dirName}`);
      patched++;
    }
  } catch (err) {
    console.error(`  ❌ Error patching ${dirName}:`, err.message);
    errors++;
  }
}

console.log(`\n═══════════════════════════════════`);
console.log(`Patched: ${patched}, Skipped: ${skipped}, Errors: ${errors}`);
console.log(`Total: ${routes.length} cron routes`);
