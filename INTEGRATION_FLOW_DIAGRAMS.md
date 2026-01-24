# 🔄 INTEGRATION FLOW DIAGRAMS - Where Things Break

---

## FLOW 1: LOGIN & SESSION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOGIN FLOW (BROKEN)                         │
└─────────────────────────────────────────────────────────────────┘

User Types Email/Password
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ LoginForm.tsx (Client)                                          │
│ - Gets email, password                                          │
│ - Calls: signIn("credentials", {email, password})              │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ NextAuth CredentialsProvider                                    │
│ - Calls authorize() callback                                    │
│ - Validates with authService.verifyCredentials()               │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ authService.verifyCredentials() (Server)                        │
│ - Finds user by email                                           │
│ - Compares password hash                                        │
│ - Returns: { id, email, name, image }                          │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ NextAuth Creates Session                                        │
│ - Session callback creates JWT                                  │
│ ❌ PROBLEM: Session only includes basic user fields             │
│    Session.user = { id, email, name, image? }                  │
│    But 'image' is missing from credentials return               │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ useAuth() Hook (Client)                                         │
│ - Gets session with useSession()                                │
│ ❌ BUG #1: session.user.image is undefined                      │
│   - Returned from verifyCredentials but not in session          │
│   - No profile picture loaded                                   │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard loads                                                 │
│ - WelcomeBanner tries to display: user.name ✅                 │
│ - WelcomeBanner tries to display: user.image ❌ (undefined)    │
│ - Streak display: stats.currentStreak (not loaded yet)         │
└─────────────────────────────────────────────────────────────────┘
        ↓
        RESULT: Dashboard loads but user picture missing
```

**Fix:** Make sure `image` field is included in session.user

---

## FLOW 2: DASHBOARD STATS DISPLAY (BROKEN)

```
┌─────────────────────────────────────────────────────────────────┐
│                     STATS DISPLAY (BROKEN)                      │
└─────────────────────────────────────────────────────────────────┘

useStats(30) Hook
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ Fetches: GET /api/stats?period=30                               │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ /api/stats/route.ts → StatsService.getOverallStats()            │
│ Returns:                                                         │
│ {                                                                │
│   stats: {                                                       │
│     totalProblems: 42,                                          │
│     recentActivity: [                                           │
│       {                                                          │
│         id: "...",                                              │
│         date: 2025-01-25,                                       │
│         problemsSolved: 5,      ← Field name is 'problemsSolved'│
│         timeSpent: 120,                                         │
│       }                                                          │
│     ]                                                            │
│   }                                                              │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ dashboard/page.tsx - Calculate todayProblems                     │
│                                                                  │
│ const todayProblems = stats.recentActivity                      │
│   .filter(a => a.date === today)                                │
│   .reduce((sum, a) => sum + (a.problems || 0), 0)              │
│                                                                  │
│ ❌ BUG #2: Using a.problems, but response has a.problemsSolved  │
│   a.problems = undefined                                        │
│   todayProblems = 0 (always!)                                   │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ StatsCards Component                                            │
│ - Displays: "Today: 0 problems" (should be 5)                  │
│ - Shows wrong metric                                            │
│ - Breaks daily activity tracking                                │
└─────────────────────────────────────────────────────────────────┘
        ↓
        RESULT: Dashboard shows 0 problems even when there are 5
```

**Fix:** Change `a.problems` → `a.problemsSolved` in dashboard/page.tsx:62

---

## FLOW 3: PLATFORM SYNC (MOST BROKEN)

```
┌──────────────────────────────────────────────────────────────────┐
│                 PLATFORM SYNC FLOW (BROKEN)                      │
└──────────────────────────────────────────────────────────────────┘

User Clicks "Sync All Platforms"
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard handleSync()                                           │
│ setIsSyncing(true)                                              │
│ await axios.post('/api/sync/trigger-all')                       │
│ ❌ BUG #9: WRONG ENDPOINT PATH!                                 │
│    Should be: '/api/sync'                                       │
└──────────────────────────────────────────────────────────────────┘
        ↓
   ❌ CATCH: 404 NOT FOUND
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Toast shows: "Sync failed"                                       │
│ User confused                                                    │
└──────────────────────────────────────────────────────────────────┘

        ───── IF ENDPOINT WAS CORRECT: /api/sync ─────
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ /api/sync/route.ts POST                                          │
│ Calls: SyncService.syncAllPlatforms()                            │
│ Returns: { success, jobId, platformCount }                      │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ SyncService.syncAllPlatforms()                                   │
│ - Gets all UserPlatform records                                 │
│ - For each platform calls syncPlatform()                        │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ SyncService.syncPlatform()                                       │
│ - Finds UserPlatform record                                     │
│                                                                  │
│ ❌ BUG #4: Tries to use token field:                            │
│    token: userPlatform.token || ''   ← DOESN'T EXIST!          │
│                                                                  │
│    (Prisma schema has 'credentials' field, not 'token')         │
│    token is always empty string ''                              │
│                                                                  │
│ - Gets scraper (e.g., GitHub scraper)                           │
│ - Calls: scraper.fetchData({ username, token: '' })            │
└──────────────────────────────────────────────────────────────────┘
        ↓
   ❌ AUTHENTICATION FAILS
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ GitHub API returns: 401 Unauthorized                             │
│ Scraper throws error                                             │
│ SyncLog status = FAILED                                          │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ BUT WAIT! There's another bug...                                 │
│ SyncService tries to upsert entry:                               │
│                                                                  │
│ await prisma.trackerEntry.upsert({                              │
│   where: {                                                       │
│     userId_date_platform: { ← INVALID CONSTRAINT!              │
│       userId,                                                    │
│       date,                                                      │
│       platform,                                                  │
│     }                                                            │
│   },                                                             │
│   update: { problems: ..., ← WRONG FIELD NAME!                 │
│   create: { problems: ..., ← WRONG FIELD NAME!                 │
│ })                                                               │
│                                                                  │
│ ❌ BUG #5: Schema has NO unique constraint named                │
│    'userId_date_platform'                                       │
│ ❌ BUG #3: Using 'problems' but schema has 'problemsSolved'     │
│                                                                  │
│ RESULT: Prisma validation error                                 │
└──────────────────────────────────────────────────────────────────┘
        ↓
   ❌ 500 ERROR: Prisma validation failed
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard shows: "Sync failed"                                   │
│ Console shows: 500 error                                         │
│ User clicks retry → same error                                   │
└──────────────────────────────────────────────────────────────────┘

        RESULT: Sync completely broken (multiple cascading bugs)
```

**Fixes Required:**
1. Fix endpoint path: `/api/sync/trigger-all` → `/api/sync`
2. Fix token field: use `credentials` not `token`
3. Fix composite key: add `@@unique([userId, date, platformId])`
4. Fix field names: `problems` → `problemsSolved`

---

## FLOW 4: CONNECT PLATFORM (DATA LOSS)

```
┌──────────────────────────────────────────────────────────────────┐
│            CONNECT PLATFORM FLOW (DATA LOSS)                     │
└──────────────────────────────────────────────────────────────────┘

User Clicks: "Connect GitHub"
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ OAuth flow (GitHub login)                                        │
│ - User authenticates with GitHub                                │
│ - App gets OAuth token                                          │
│ - Returns to frontend with token                                │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Frontend calls: POST /api/platforms/connect                      │
│ {                                                                │
│   platformId: "github-id",                                       │
│   username: "john_doe",                                          │
│   token: "gho_16C7e42F292c6912E7..."  ← OAuth token             │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ PlatformService.connectPlatform()                                │
│ await prisma.userPlatform.create({                               │
│   data: {                                                        │
│     userId,                                                      │
│     platformId,                                                  │
│     username,                                                    │
│     token,  ← Tries to save token                               │
│   }                                                              │
│ })                                                               │
│                                                                  │
│ ❌ BUG #4: Schema has 'credentials' field, not 'token'          │
│    Prisma silently ignores unknown fields                       │
│    Token is NOT saved!                                          │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Database saves:                                                  │
│ UserPlatform {                                                   │
│   userId: "user-123",                                            │
│   platformId: "github-id",                                       │
│   username: "john_doe",                                          │
│   credentials: null,  ← EMPTY! Token lost!                      │
│   isActive: true,                                                │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ User sees: "GitHub connected successfully"                       │
│ Frontend refreshes connections list                              │
│ GitHub shows as connected ✅                                     │
│ (But token is missing!)                                          │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ User clicks: "Sync"                                              │
│                                                                  │
│ SyncService tries to fetch with empty token                      │
│ GitHub API returns: 401 Unauthorized                             │
│ Sync fails silently                                              │
│ User: "Why isn't it syncing?"                                    │
└──────────────────────────────────────────────────────────────────┘

        RESULT: Connection "works" but oauth token lost
```

**Fix:** Change API to save OAuth token properly to `credentials` field

---

## FLOW 5: MONTHLY STATS (404 ERRORS)

```
┌──────────────────────────────────────────────────────────────────┐
│               MONTHLY STATS FLOW (404 ERRORS)                    │
└──────────────────────────────────────────────────────────────────┘

Dashboard loads
        ↓
const { monthlyStats } = useMonthlyStats(6)
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ useStats.ts - useMonthlyStats()                                  │
│ Calls: useSWR(`/api/stats/monthly?months=6`, fetcher)           │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Browser makes: GET /api/stats/monthly?months=6                  │
│                                                                  │
│ ❌ BUG #7: Endpoint does not exist!                              │
│                                                                  │
│ Expected endpoints:                                              │
│ ✅ GET  /api/stats           ← EXISTS                            │
│ ✅ POST /api/stats           ← EXISTS                            │
│ ❌ GET  /api/stats/monthly   ← DOES NOT EXIST                    │
│ ❌ GET  /api/stats/heatmap   ← DOES NOT EXIST (BUG #8)          │
│ ❌ GET  /api/stats/insights  ← DOES NOT EXIST                    │
└──────────────────────────────────────────────────────────────────┘
        ↓
   Server returns: 404 NOT FOUND
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Axios error caught in useSWR                                     │
│ data = undefined                                                 │
│ error = { status: 404 }                                          │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ useMonthlyStats returns:                                         │
│ {                                                                │
│   monthlyStats: [],  ← Empty array (data?.monthlyStats || [])   │
│   isLoading: false,                                              │
│   error: {...}       ← Has error but never displayed             │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ TrendChart Component receives:                                   │
│ monthlyStats: []                                                 │
│                                                                  │
│ Renders empty chart                                              │
│ No data visualization                                            │
│ No error message (error state not handled)                       │
└──────────────────────────────────────────────────────────────────┘
        ↓
        RESULT: Empty chart + 404 error in console
```

**Fix:** Create `/api/stats/monthly` and `/api/stats/heatmap` endpoints

---

## FLOW 6: TRACKER ENTRY CREATION (SILENT DATA LOSS)

```
┌──────────────────────────────────────────────────────────────────┐
│          MANUAL TRACKER ENTRY (SILENT DATA LOSS)                 │
└──────────────────────────────────────────────────────────────────┘

User navigates to Tracker page
        ↓
User fills form:
- Date: 2025-01-25
- Problems solved: 5
- Time spent: 120 minutes
        ↓
Clicks: "Log Entry"
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Frontend calls: POST /api/tracker                                │
│ {                                                                │
│   date: "2025-01-25T10:00:00Z",                                  │
│   problems: 5,            ← Field name                           │
│   timeSpent: 120,                                                │
│   notes: "LeetCode hard problems"                                │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ /api/tracker/route.ts POST                                       │
│ await prisma.trackerEntry.create({                               │
│   data: {                                                        │
│     userId: "user-123",                                          │
│     date: new Date("2025-01-25T10:00:00Z"),                      │
│     platform: data.platform,       ← Saved as 'platform'        │
│     problems: data.problems,       ← Saved as 'problems'        │
│     timeSpent: data.timeSpent,                                   │
│     notes: data.notes,                                           │
│   }                                                              │
│ })                                                               │
│                                                                  │
│ ❌ BUG #3 & #10: Schema field names different!                  │
│                                                                  │
│    Prisma Schema expects:                                       │
│    - problemsSolved (not problems)                              │
│    - category (not platform)                                    │
│                                                                  │
│    Prisma silently ignores unknown fields!                      │
│    No error thrown, no warning                                  │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Database actually saves:                                         │
│ TrackerEntry {                                                   │
│   userId: "user-123",                                            │
│   date: 2025-01-25T10:00:00Z,                                    │
│   platformId: null,       ← 'platform' field ignored, so null   │
│   problemsSolved: 0,      ← 'problems' field ignored, so 0      │
│   timeSpent: 120,         ← ✅ This is correct                  │
│   notes: "LeetCode hard problems",                               │
│   mood: null,                                                    │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ Frontend shows: "Entry logged successfully"                      │
│ User: "Great! My progress is saved"                              │
│                                                                  │
│ ❌ REALITY: Entry saved but...                                  │
│    - Problems count = 0 (user entered 5)                        │
│    - Platform info = null (user selected LeetCode)              │
│    - Only timeSpent saved correctly                              │
│                                                                  │
│    30% data loss per entry!                                     │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ User views Dashboard stats:                                      │
│ - "5 problems solved today" → Shows 0 (wrong!)                  │
│ - "120 minutes today" → Shows 120 (correct)                     │
│ - Charts broken because problem count is 0                       │
│ - All achievements based on problems don't work                  │
└──────────────────────────────────────────────────────────────────┘

        RESULT: Data silently lost, user unaware
```

**Fix:** Update API to use correct field names (`problemsSolved` not `problems`)

---

## CRITICAL ISSUES SUMMARY TABLE

| Issue | Flow | Impact | Error Type |
|-------|------|--------|-----------|
| #1 | Login | Incomplete user data | Type mismatch |
| #2 | Stats Display | Wrong numbers | Field mismatch |
| #3 | Tracker/Sync | Data lost | Field mismatch |
| #4 | Platform Connect | OAuth token lost | Schema mismatch |
| #5 | Sync | 500 error | Invalid constraint |
| #7 | Monthly Stats | 404 error | Missing endpoint |
| #8 | Heatmap | 404 error | Missing endpoint |
| #9 | Sync Button | 404 error | Wrong path |
| #10 | Manual Tracker | Data lost | Field mismatch |

---

## How to Trace These Issues Yourself

### In Browser DevTools:

1. **Network Tab** → Check API responses match component expectations
2. **Console** → Look for 404 errors and Prisma validation errors
3. **React DevTools** → Inspect component props vs actual data

### In VS Code:

1. Open API file (e.g., `/api/stats/route.ts`)
2. See what it returns
3. Open hook file (e.g., `useStats.ts`)
4. See what it expects
5. **Compare field names**

### In Database:

1. Check actual schema: `prisma/schema.prisma`
2. See what fields exist
3. Check what services try to save
4. **If names don't match → DATA IS LOST**

---

**Next:** See DEEP_INTEGRATION_BUGS.md for detailed fixes
