# 📁 FILE FIX PRIORITY - Exact Order

**Which files to fix first, second, third... in order**  
**With exact line numbers**

---

## 🎯 QUICK REFERENCE TABLE

| Order | File | Lines | Time | Status |
|-------|------|-------|------|--------|
| 1 | syncService.ts | 81-84, 107-112, 118-137 | 1.5h | ⏳ |
| 2 | platformService.ts | 62-80 | 1h | ⏳ |
| 3 | syncService.ts (again) | 81-84 | 0.5h | ⏳ |
| 4 | tracker/route.ts | 60-70 | 0.5h | ⏳ |
| 5 | Create monthly/route.ts | New file | 0.5h | ⏳ |
| 6 | Create heatmap/route.ts | New file | 0.5h | ⏳ |
| 7 | dashboard/page.tsx | 35 | 0.25h | ⏳ |
| 8 | auth.ts | 40-60 | 0.5h | ⏳ |
| 9 | useStats.ts | Error handling | 0.5h | ⏳ |
| 10 | useGoals.ts | Error handling | 0.5h | ⏳ |

---

## PRIORITY #1 ⭐ MOST IMPORTANT

### File: `src/services/syncService.ts`

**Why First:**  
Fixes data loss, crashes, and OAuth tokens all at once.

**Changes needed:**

#### Change #1: Fix invalid composite key (Line 107-112)
```
Current:
  where: {
    userId_date_platform: {
      userId: userId,
      date: date,
      platformId: platformId
    }
  }

Change to:
  where: {
    userId: userId,
    date: date,
    platformId: platformId
  }
```

#### Change #2: Fix OAuth token field (Line 81-84)
```
Current:
  token: userPlatform.token || ''

Change to:
  credentials: userPlatform.credentials || '{}'
```

#### Change #3: Fix problem field name (Line 118-137)
```
Current (in upsert):
  problemsSolved: data.problems,

Change to:
  problemsSolved: data.problemsSolved || 0,
```

**Estimated Time:** 1.5 hours  
**Risk if skipped:** Sync crashes, data lost, OAuth fails  

---

## PRIORITY #2

### File: `src/services/platformService.ts`

**Why Here:**  
Fixes OAuth token storage so sync doesn't fail later.

**Changes needed:**

#### Change: Fix token field to credentials (Line 62-80)
```
Current:
  data: {
    userId: userId,
    platform: platform,
    token: tokens.access_token,
    ...
  }

Change to:
  data: {
    userId: userId,
    platform: platform,
    credentials: JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at
    }),
    ...
  }
```

**Estimated Time:** 1 hour  
**Risk if skipped:** OAuth platforms fail, sync returns 401  

---

## PRIORITY #3

### File: `src/app/api/tracker/route.ts`

**Why Here:**  
Fixes manual tracker entries from losing data.

**Changes needed:**

#### Change: Fix problem field name (Line 60-70)
```
Current:
  problems: data.problems || 0,

This is correct! ✅

Actually, the real fix:
Make sure this uses 'problemsSolved' to match schema:
  problemsSolved: data.problems || 0,
```

**Estimated Time:** 0.5 hours  
**Risk if skipped:** Manual entries always save with 0 problems  

---

## PRIORITY #4 ⭐ CREATE NEW FILE #1

### File: `src/app/api/stats/monthly/route.ts` 
**Status:** DOESN'T EXIST - Create it

**Location:** Create new folder and file

**Contents:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { StatsService } from '@/services/statsService';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const months = parseInt(req.nextUrl.searchParams.get('months') || '6');
  const data = await StatsService.getMonthlyStats(session.user.id, months);
  
  return NextResponse.json(data);
}
```

**Estimated Time:** 0.5 hours  
**Risk if skipped:** Monthly trend chart shows 404 error  

---

## PRIORITY #5 ⭐ CREATE NEW FILE #2

### File: `src/app/api/stats/heatmap/route.ts`
**Status:** DOESN'T EXIST - Create it

**Location:** Create new folder and file

**Contents:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { StatsService } from '@/services/statsService';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = parseInt(req.nextUrl.searchParams.get('days') || '365');
  const data = await StatsService.getHeatmapData(session.user.id, days);
  
  return NextResponse.json(data);
}
```

**Estimated Time:** 0.5 hours  
**Risk if skipped:** Activity heatmap shows 404 error  

---

## PRIORITY #6

### File: `src/app/(dashboard)/dashboard/page.tsx`

**Why Here:**  
Fixes sync button 404 error.

**Changes needed:**

#### Change: Fix endpoint path (Line 35)
```
Current:
  await fetch('/api/sync/trigger-all', {

Change to:
  await fetch('/api/sync', {
```

**Estimated Time:** 15 minutes  
**Risk if skipped:** Sync button gives 404 when clicked  

---

## PRIORITY #7

### File: `src/lib/auth.ts`

**Why Here:**  
Completes user session with profile picture.

**Changes needed:**

#### Change: Fetch full user data in session callback (Line 40-60)
```
Current:
  callbacks: {
    session: async ({ session, user }) => {
      return session;
    }
  }

Change to:
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user && user) {
        session.user.image = user.image;
        session.user.id = user.id;
      }
      return session;
    }
  }
```

**Estimated Time:** 0.5 hours  
**Risk if skipped:** User profile picture doesn't load  

---

## PRIORITY #8

### File: `src/hooks/useStats.ts`

**Why Here:**  
Shows error messages when API fails.

**Changes needed:**

#### Change: Add error handling (Add after all useSWR calls)
```
Add this after line 80 (at end of hook):

  return {
    stats: data?.stats,
    isLoading: !data && !error,
    isError: !!error,
    error: error?.message || 'Failed to load stats'
  }
```

**Estimated Time:** 0.5 hours  
**Risk if skipped:** Users see nothing when API fails  

---

## PRIORITY #9

### File: `src/hooks/useGoals.ts`

**Why Here:**  
Shows error messages and prevents hidden goals.

**Changes needed:**

#### Change: Add error handling + fix filter (Line 50-55)
```
Current:
  const activeGoals = goals?.filter(g => g.status === 'ACTIVE') || []

Change to:
  const activeGoals = goals?.filter(g => g?.status === 'ACTIVE') || []
  
  // Add error handling:
  return {
    goals: activeGoals,
    isLoading,
    isError: !!error,
    error: error?.message || 'Failed to load goals'
  }
```

**Estimated Time:** 0.5 hours  
**Risk if skipped:** Goals hidden, silent failures  

---

## ✅ AFTER COMPLETING ALL

**Test These (20 minutes):**

```
TEST 1: Login
- Click login
- Enter username & password
- Picture shows? ✅ or ❌

TEST 2: Enter Data
- Click "Track Problem"
- Enter 5 problems
- Dashboard shows 5? ✅ or ❌

TEST 3: Sync
- Click "Sync All Platforms"
- Dashboard shows "Syncing..."? ✅ or ❌
- Completes without error? ✅ or ❌

TEST 4: Charts
- View dashboard
- Trend chart shows data? ✅ or ❌
- Heatmap shows data? ✅ or ❌
- Numbers are correct? ✅ or ❌

TEST 5: Console
- Open browser dev tools (F12)
- Switch to Console tab
- Any red error messages? ✅ none or ❌ yes
```

---

## 🎯 QUICK DECISION TREE

**"Which file should I open right now?"**

1. Have you modified syncService.ts yet? → NO → **Start there!**
2. Have you modified platformService.ts yet? → NO → **Do that next**
3. Have you created monthly/route.ts? → NO → **Create it**
4. Have you created heatmap/route.ts? → NO → **Create it**
5. Have you fixed dashboard.tsx line 35? → NO → **Do that**
6. Have you tested sync button? → NO → **Test now**

If you answered YES to #6 and sync worked → **Continue to steps 7-9**

---

## 💾 SAVE AS YOU GO

After each file change:
1. Save the file (Ctrl+S)
2. Let VS Code compile (wait 10 seconds)
3. Refresh browser if testing
4. Check console (F12) for errors
5. If error: Go back and recheck your change
6. If OK: Move to next file

---

## ⏱️ TIME CHECK

| Completed | Total Time |
|-----------|-----------|
| Priority 1 | 1.5 hours |
| 1-2 | 2.5 hours |
| 1-3 | 3 hours |
| 1-4 | 3.5 hours |
| 1-5 | 4 hours |
| 1-6 | 4.25 hours |
| 1-7 | 4.75 hours |
| 1-8 | 5.25 hours |
| 1-9 | 6 hours ✅ DONE |

---

## 📞 IF YOU GET STUCK

| Problem | Solution |
|---------|----------|
| "Can't find the line" | Search for the exact text in VS Code (Ctrl+F) |
| "File doesn't exist" | It shouldn't exist yet, you need to CREATE it |
| "Error after change" | Reread the change carefully, make sure quotes match |
| "Not sure what to change" | Read DEEP_INTEGRATION_BUGS.md for that priority number |
| "Tests are failing" | You probably made a typo, check spacing and brackets |

---

**Next Step:** Pick Priority #1, open syncService.ts, make the changes  
**When Done:** Come back here and move to Priority #2  
**Total Time:** ~6 hours for everything

**You can do this! 🚀**
