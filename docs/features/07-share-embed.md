# 🔗 Share & Embed

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## 🎯 Overview

Users can create public profile links to share their progress with employers, teammates, or the community.

---

## 🌐 Share Link Features

- **Custom slug**: e.g., `vriddhi-app.vercel.app/share/prem015`
- **Configurable visibility**: Choose what to show/hide
- **View analytics**: See how many times your profile was viewed
- **Expiry**: Optional expiry date for temporary sharing

---

## ⚙️ What's Visible on Public Profile

| Section | Configurable |
|---------|-------------|
| Username & bio | via user settings |
| Current streak | `showStreak` setting |
| Total problems solved | `showActivity` setting |
| Platform list | `showPlatforms` setting |
| Achievements | `showAchievements` setting |
| Goals | `showGoals` setting |
| Activity heatmap | `showActivity` setting |

---

## 📡 API

```http
# Create share link
POST /api/share
{
  "slug": "prem015",
  "expiresAt": "2026-12-31",
  "showStreak": true,
  "showGoals": false
}

# Public view (no auth)
GET /api/share/prem015

# Delete share link
DELETE /api/share/:id
```

---

## 📎 Related Docs

- [Core Features](01-core-features-overview.md)
