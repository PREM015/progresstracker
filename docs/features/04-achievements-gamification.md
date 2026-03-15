# 🏆 Achievements & Gamification

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

ProgressTracker has **50+ achievements** (badges) to reward user milestones and encourage consistent practice.

---

## 🏅 Achievement Categories

### 🔥 Streak Achievements
| Badge | Condition |
|-------|-----------|
| First Flame | First 3-day streak |
| Week Warrior | 7-day streak |
| Month Master | 30-day streak |
| Century Coder | 100-day streak |
| Year of Code | 365-day streak |

### 🧮 Problem Solving Achievements
| Badge | Condition |
|-------|-----------|
| First Problem | Solve first problem |
| Ten Master | Solve 10 problems |
| Century Solver | Solve 100 problems |
| Problem Elite | Solve 1000 problems |
| LeetCode Hero | 200 LeetCode problems |

### 📦 Platform Achievements
| Badge | Condition |
|-------|-----------|
| Multi-Platform | Connect 3 platforms |
| Platform Pro | Connect 10 platforms |
| GitHub Star | 500 GitHub commits |
| Open Source Hero | First PR merged |

### 🎯 Consistency Achievements
| Badge | Condition |
|-------|-----------|
| Early Bird | Log activity before 7AM (3x) |
| Night Owl | Log activity after 11PM (3x) |
| Weekend Warrior | Activity 4 weekends in a row |
| Full Month | Activity every day of a calendar month |

### 🏆 Milestone Achievements
| Badge | Condition |
|-------|-----------|
| First Goal | Complete first goal |
| Goal Crusher | Complete 10 goals |
| Streak Saver | Use a streak freeze |
| Referral Pro | Refer 5 friends |
| Export King | Export data 5 times |

---

## ⚙️ Achievement Unlock Logic

Achievements are checked after:
- New TrackerEntry created
- Platform sync completes
- Goal completed
- Streak updated

```typescript
// services/achievementService.ts

async function checkAchievements(userId: string): Promise<string[]> {
  const user = await getUserWithStats(userId);
  const allAchievements = await prisma.achievement.findMany();
  const earned = await prisma.userAchievement.findMany({ where: { userId } });
  const earnedIds = new Set(earned.map(e => e.achievementId));
  
  const newlyUnlocked: string[] = [];
  
  for (const achievement of allAchievements) {
    if (earnedIds.has(achievement.id)) continue; // already earned
    
    const isUnlocked = await evaluateCondition(achievement.condition, user);
    if (isUnlocked) {
      await prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id }
      });
      await notifyAchievementUnlocked(userId, achievement);
      newlyUnlocked.push(achievement.id);
    }
  }
  
  return newlyUnlocked;
}
```

---

## 🎁 Achievement Rewards

Some achievements grant rewards:
- **Points** added to total (used for leaderboard)
- **Streak freezes** (special achievements)
- **Export credits** (one-time use)

---

## 📎 Related Docs

- [Streak System](03-streak-system.md)
- [Leaderboard](08-leaderboard.md)
- [Notifications](05-notifications.md)
