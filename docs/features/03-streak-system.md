# 🔥 Streak System

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

The streak system tracks **consecutive days of coding activity**. A day counts if the user has at least one TrackerEntry (manual or synced).

---

## ⚙️ Streak Calculation Logic

```typescript
// services/streakService.ts

async function updateStreak(userId: string): Promise<void> {
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  
  // Check if user logged activity today
  const todayEntry = await prisma.trackerEntry.findFirst({
    where: { userId, date: { gte: today } }
  });
  
  // Check if user logged activity yesterday
  const yesterdayEntry = await prisma.trackerEntry.findFirst({
    where: { userId, date: { gte: yesterday, lt: today } }
  });
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  let newStreak = user.currentStreak;
  
  if (todayEntry) {
    if (yesterdayEntry || newStreak === 0) {
      // Continue or start streak
      newStreak = user.lastActivityDate 
        ? isSameDay(user.lastActivityDate, yesterday) 
          ? newStreak + 1 
          : 1
        : 1;
    }
  } else {
    // No activity today - check if streak should break
    const isStreakBroken = !yesterdayEntry && user.currentStreak > 0;
    if (isStreakBroken) {
      // Record streak history before breaking
      await prisma.streakHistory.create({
        data: { userId, streakLength: user.currentStreak, endDate: yesterday }
      });
      newStreak = 0;
    }
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(user.longestStreak, newStreak),
      lastActivityDate: todayEntry ? today : user.lastActivityDate,
    }
  });
}
```

---

## 🏆 Streak Milestones

| Days | Achievement | Notification |
|------|-------------|-------------|
| 3 | 🔥 First Flame | In-app |
| 7 | 🌟 Week Warrior | Email + In-app |
| 14 | ⚡ Two Weeks Strong | Email + In-app |
| 30 | 💪 Month Master | Email + In-app + Push |
| 50 | 🎯 50-Day Champion | Email + In-app |
| 100 | 🏆 Century Coder | Email + In-app + Push |
| 365 | 👑 Year of Code | Email + In-app + Push + Tweet prompt |

---

## ❄️ Streak Freeze

Pro and above users get **1 streak freeze per month**.

- A freeze protects the streak for one missed day
- Used automatically when the next activity is logged
- Cannot chain freezes (only 1 consecutive missed day protected)

```typescript
// Check if streak freeze should be applied
async function maybeApplyStreakFreeze(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (user.streakFreezeCount > 0 && shouldStreakBreak(user)) {
    // Use a freeze instead of breaking the streak
    await prisma.user.update({
      where: { id: userId },
      data: { 
        streakFreezeCount: user.streakFreezeCount - 1,
        streakFreezeUsedAt: new Date()
      }
    });
    return true; // streak protected
  }
  return false;
}
```

---

## ⚠️ Streak At-Risk Alerts

A daily job at **8PM user timezone** checks if streak may break:

```
If:
- User has a streak > 0
- No activity recorded today
→ Send "Your streak is at risk!" notification
```

---

## 📊 Activity Heatmap

The 365-day heatmap shows daily activity intensity:

| Level | Problems / Activity |
|-------|---------------------|
| 0 (dark) | No activity |
| 1 (light green) | 1-2 activities |
| 2 | 3-5 activities |
| 3 | 6-9 activities |
| 4 (bright green) | 10+ activities |

---

## 📎 Related Docs

- [Goals System](02-goals-system.md)
- [Achievements](04-achievements-gamification.md)
- [Notifications](05-notifications.md)
